import type { NotificationPriority, NotificationType } from "./notification.model.js";

export interface NotificationTemplateInput { templateId: string; type: NotificationType; priority?: NotificationPriority; title: string; message: string; resourceType?: string; resourceId?: string; actionUrl?: string; metadata?: Record<string, unknown>; }
export function resolveNotificationTemplate(input: NotificationTemplateInput) {
  return { templateId: input.templateId, templateVersion: 1, channel: "in_app" as const, locale: "en", title: input.title, body: input.message, action: input.actionUrl ? { label: "View details", url: input.actionUrl } : undefined, metadata: input.metadata, type: input.type, priority: input.priority ?? "normal", resourceType: input.resourceType, resourceId: input.resourceId };
}
