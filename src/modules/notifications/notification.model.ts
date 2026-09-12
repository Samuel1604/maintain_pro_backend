import { Schema, model, Document, Types } from "mongoose";

export type NotificationType =
  | "security"
  | "work_order"
  | "invitation"
  | "service_request"
  | "billing"
  | "procurement"
  | "inventory"
  | "system";

export type NotificationPriority = "low" | "normal" | "high" | "critical";

export interface INotification extends Document {
  recipientId: Types.ObjectId;
  actorId?: Types.ObjectId;
  organizationId?: Types.ObjectId;
  vendorId?: Types.ObjectId;
  facilityId?: Types.ObjectId;

  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;

  isRead: boolean;
  readAt?: Date;

  resourceType?: string;
  resourceId?: string;
  idempotencyKey?: string;

  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    actorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      index: true,
    },
    vendorId: {
      type: Schema.Types.ObjectId,
      ref: "Vendor",
      index: true,
    },
    facilityId: {
      type: Schema.Types.ObjectId,
      ref: "Facility",
      index: true,
    },
    type: {
      type: String,
      enum: ["security", "work_order", "invitation", "service_request", "billing", "procurement", "inventory", "system"],
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    priority: {
      type: String,
      enum: ["low", "normal", "high", "critical"],
      default: "normal",
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
    },
    resourceType: {
      type: String,
      trim: true,
    },
    resourceId: {
      type: String,
      trim: true,
    },
    idempotencyKey: { type: String, unique: true, sparse: true, index: true },
  },
  {
    timestamps: true,
  },
);

export const Notification = model<INotification>("Notification", notificationSchema);
