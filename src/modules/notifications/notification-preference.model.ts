import { Schema, model, type Document, type Types } from "mongoose";
export interface INotificationPreference extends Document { userId: Types.ObjectId; channels: Record<string, { inApp: boolean; email: boolean; push: boolean; sms: boolean }>; quietHours?: { enabled: boolean; start: string; end: string }; createdAt: Date; updatedAt: Date }
const schema = new Schema<INotificationPreference>({ userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true }, channels: { type: Schema.Types.Mixed, default: {} }, quietHours: { enabled: Boolean, start: String, end: String } }, { timestamps: true });
export const NotificationPreference = model<INotificationPreference>("NotificationPreference", schema);
