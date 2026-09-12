import { NotificationRepository } from "./notification.repository.js";
import type { IPushProvider } from "@/infrastructure/notifications/push.provider.interface.js";
import { MockPushProvider } from "@/infrastructure/notifications/mock.push-provider.js";
import { resolveNotificationTemplate } from "./notification-template.resolver.js";
import { NotFoundException } from "@/shared/errors/index.js";
import { toObjectId } from "@/shared/validators/index.js";
import type {
  INotification,
  NotificationType,
  NotificationPriority,
} from "./notification.model.js";
import { eventPublisher } from "@/container/index.js";
import { BusinessFactEvent } from "@/infrastructure/events/business-fact.event.js";
import { RedisCache } from "@/infrastructure/cache/redis.cache.js";
import { cacheKeys, cacheTtlSeconds } from "@/infrastructure/cache/cache-keys.js";
import { cacheHash } from "@/shared/utils/cache-hash.js";

export interface CreateNotificationParams {
  recipientId: string;
  actorId?: string;
  organizationId?: string;
  vendorId?: string;
  facilityId?: string;
  type: NotificationType;
  templateId?: string;
  title: string;
  message: string;
  priority?: NotificationPriority;
  resourceType?: string;
  resourceId?: string;
  sendPush?: boolean;
  idempotencyKey?: string;
}

export class NotificationPolicyService {
  constructor(
    private readonly repository: NotificationRepository = new NotificationRepository(),
    private readonly pushProvider: IPushProvider = new MockPushProvider(),
  ) {}
  private cache = new RedisCache();

  async notifyUser(params: CreateNotificationParams): Promise<INotification> {
    if (params.idempotencyKey) {
      const existing = await this.repository.findByIdempotencyKey(params.idempotencyKey);
      if (existing) return existing;
    }
    const rendered = resolveNotificationTemplate({ templateId: params.templateId ?? `notification.${params.type}`, type: params.type, priority: params.priority, title: params.title, message: params.message, resourceType: params.resourceType, resourceId: params.resourceId });
    const notification = await this.repository.create({
      recipientId: toObjectId(params.recipientId),
      ...(params.actorId && { actorId: toObjectId(params.actorId) }),
      ...(params.organizationId && {
        organizationId: toObjectId(params.organizationId),
      }),
      ...(params.vendorId && { vendorId: toObjectId(params.vendorId) }),
      ...(params.facilityId && { facilityId: toObjectId(params.facilityId) }),
      type: params.type,
      title: rendered.title,
      message: rendered.body,
      priority: params.priority || "normal",
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      idempotencyKey: params.idempotencyKey,
    });
    await this.invalidateCaches(params.recipientId);

    await eventPublisher.publish(new BusinessFactEvent("NotificationCreated", {
      recipientId: notification.recipientId.toString(),
    }, { organizationId: params.organizationId, actorId: params.actorId, aggregateType: "notification", aggregateId: notification._id.toString() }));

    if (params.sendPush !== false) {
      await this.pushProvider.sendToUser(params.recipientId, {
        title: rendered.title,
        body: rendered.body,
        data: {
          notificationId: notification._id.toString(),
          resourceType: params.resourceType || "",
          resourceId: params.resourceId || "",
        },
      });
    }

    return notification;
  }

  async getUserNotifications(
    recipientId: string,
    page: number = 1,
    limit: number = 20,
    options: { organizationId?: string; unread?: boolean; type?: string; priority?: string } = {},
  ): Promise<{ data: INotification[]; total: number }> {
    const key = cacheKeys.notifications(recipientId, cacheHash({ page, limit, options }));
    const cached = await this.cache.get<{ data: INotification[]; total: number }>(key);
    if (cached) return cached;
    const result = await this.repository.findByRecipient(recipientId, { ...options, page, limit });
    await this.cache.set(key, result, cacheTtlSeconds.notifications);
    return result;
  }

  async getUnreadCount(recipientId: string): Promise<number> {
    const key = cacheKeys.unreadNotifications(recipientId);
    const cached = await this.cache.get<number>(key);
    if (cached !== null) return cached;
    const count = await this.repository.countUnread(recipientId);
    await this.cache.set(key, count, cacheTtlSeconds.notifications);
    return count;
  }

  async markAsRead(id: string, recipientId: string): Promise<INotification> {
    const updated = await this.repository.markAsRead(id, recipientId);
    if (!updated) {
      throw new NotFoundException("Notification not found.");
    }
    await this.invalidateCaches(recipientId);
    return updated;
  }

  async markAllAsRead(recipientId: string): Promise<void> {
    await this.repository.markAllAsRead(recipientId);
    await this.invalidateCaches(recipientId);
  }

  private async invalidateCaches(recipientId: string) {
    await this.cache.delete(cacheKeys.unreadNotifications(recipientId));
    await this.cache.deleteByPattern(`cache:v1:user:${recipientId}:notifications:*`);
  }
}
