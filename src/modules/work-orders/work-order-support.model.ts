import { Schema, model, Document, Types } from "mongoose";

export interface IWorkOrderAttachment extends Document { workOrderId: Types.ObjectId; uploadId: Types.ObjectId; uploadedBy: Types.ObjectId; createdAt: Date; }
export interface IWorkOrderTimeLog extends Document { workOrderId: Types.ObjectId; userId: Types.ObjectId; hours: number; note?: string; startedAt?: Date; endedAt?: Date; createdAt: Date; }
export interface IWorkOrderPart extends Document { workOrderId: Types.ObjectId; name: string; sku?: string; quantity: number; inventoryItemId?: Types.ObjectId; createdAt: Date; }
const base = { timestamps: true };
export const WorkOrderAttachment = model<IWorkOrderAttachment>("WorkOrderAttachment", new Schema({ workOrderId: { type: Schema.Types.ObjectId, ref: "WorkOrder", required: true, index: true }, uploadId: { type: Schema.Types.ObjectId, ref: "Upload", required: true }, uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true } }, base));
export const WorkOrderTimeLog = model<IWorkOrderTimeLog>("WorkOrderTimeLog", new Schema({ workOrderId: { type: Schema.Types.ObjectId, ref: "WorkOrder", required: true, index: true }, userId: { type: Schema.Types.ObjectId, ref: "User", required: true }, hours: { type: Number, min: 0.01, required: true }, note: String, startedAt: Date, endedAt: Date }, base));
export const WorkOrderPart = model<IWorkOrderPart>("WorkOrderPart", new Schema({ workOrderId: { type: Schema.Types.ObjectId, ref: "WorkOrder", required: true, index: true }, name: { type: String, required: true, trim: true }, sku: String, quantity: { type: Number, min: 1, required: true }, inventoryItemId: { type: Schema.Types.ObjectId, ref: "InventoryItem" } }, base));
