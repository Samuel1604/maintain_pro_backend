import { Notification, type INotification } from "./notification.model.js";
import { toObjectId } from "@/shared/validators/index.js";

export class NotificationRepository {
  async create(data: Partial<INotification>): Promise<INotification> {
    const notification = new Notification(data);
    return notification.save();
  }

  async findById(id: string): Promise<INotification | null> {
    return Notification.findById(toObjectId(id));
  }

  async findByRecipient(recipientId: string, options: { organizationId?: string; page?: number; limit?: number; unread?: boolean; type?: string; priority?: string } = {}): Promise<{ data: INotification[]; total: number }> {
    const filter: Record<string, unknown> = { recipientId: toObjectId(recipientId) };
    if (options.organizationId) filter.organizationId = toObjectId(options.organizationId);
    if (options.unread !== undefined) filter.isRead = !options.unread;
    if (options.type) filter.type = options.type;
    if (options.priority) filter.priority = options.priority;
    const page = options.page ?? 1;
    const limit = options.limit ?? 20;
    const [data, total] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      Notification.countDocuments(filter),
    ]);
    return { data, total };
  }

  async countUnread(recipientId: string): Promise<number> {
    return Notification.countDocuments({
      recipientId: toObjectId(recipientId),
      isRead: false,
    });
  }

  async markAsRead(id: string, recipientId: string): Promise<INotification | null> {
    return Notification.findOneAndUpdate(
      { _id: toObjectId(id), recipientId: toObjectId(recipientId) },
      { isRead: true, readAt: new Date() },
      { new: true },
    );
  }

  async markAllAsRead(recipientId: string): Promise<void> {
    await Notification.updateMany(
      { recipientId: toObjectId(recipientId), isRead: false },
      { isRead: true, readAt: new Date() },
    );
  }

  async findByIdempotencyKey(key: string): Promise<INotification | null> {
    return Notification.findOne({ idempotencyKey: key });
  }
}
