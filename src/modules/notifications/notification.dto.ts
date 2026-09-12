import type { INotification } from "./notification.model.js";

export interface NotificationResponse {
  id: string;
  organizationId?: string;
  vendorId?: string;
  facilityId?: string;
  type: string;
  title: string;
  message: string;
  priority: string;
  isRead: boolean;
  readAt?: string;
  resourceType?: string;
  resourceId?: string;
  createdAt: string;
}

export function toNotificationResponse(notification: INotification): NotificationResponse {
  return {
    id: notification._id.toString(),
    organizationId: notification.organizationId?.toString(),
    vendorId: notification.vendorId?.toString(),
    facilityId: notification.facilityId?.toString(),
    type: notification.type,
    title: notification.title,
    message: notification.message,
    priority: notification.priority,
    isRead: notification.isRead,
    readAt: notification.readAt?.toISOString(),
    resourceType: notification.resourceType,
    resourceId: notification.resourceId,
    createdAt: notification.createdAt.toISOString(),
  };
}
