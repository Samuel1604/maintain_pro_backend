import { Schema, model, Document, Types } from "mongoose";
import type { InventoryTransactionType } from "./inventory.types.js";

export interface IInventoryTransaction extends Document {
  organizationId: Types.ObjectId;
  itemId: Types.ObjectId;
  stockLocationId: Types.ObjectId;
  type: InventoryTransactionType;
  quantity: number;
  unitOfMeasure: string;
  workOrderId?: Types.ObjectId;
  reservationId?: Types.ObjectId;
  relatedTransactionId?: Types.ObjectId;
  sourceTransactionId?: Types.ObjectId;
  sourceLocationId?: Types.ObjectId;
  destinationLocationId?: Types.ObjectId;
  reference?: string;
  reason?: string;
  performedBy: Types.ObjectId;
  idempotencyKey?: string;
  createdAt: Date;
}

const schema = new Schema<IInventoryTransaction>({
  organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
  itemId: { type: Schema.Types.ObjectId, ref: "InventoryItem", required: true, index: true },
  stockLocationId: { type: Schema.Types.ObjectId, ref: "StockLocation", required: true, index: true },
  type: { type: String, enum: ["receipt", "issue", "consumption", "adjustment", "transfer", "return", "reservation", "release"], required: true, index: true },
  quantity: { type: Number, required: true },
  unitOfMeasure: { type: String, required: true },
  workOrderId: { type: Schema.Types.ObjectId, ref: "WorkOrder", index: true },
  reservationId: { type: Schema.Types.ObjectId, ref: "InventoryReservation", index: true },
  relatedTransactionId: { type: Schema.Types.ObjectId, ref: "InventoryTransaction" },
  sourceTransactionId: { type: Schema.Types.ObjectId, ref: "InventoryTransaction", index: true },
  sourceLocationId: { type: Schema.Types.ObjectId, ref: "StockLocation" },
  destinationLocationId: { type: Schema.Types.ObjectId, ref: "StockLocation" },
  reference: String,
  reason: String,
  performedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  idempotencyKey: { type: String, unique: true, sparse: true },
}, { timestamps: { createdAt: true, updatedAt: false } });

schema.index({ organizationId: 1, itemId: 1, createdAt: -1 });
schema.index({ organizationId: 1, createdAt: -1, type: 1 });
export const InventoryTransaction = model<IInventoryTransaction>("InventoryTransaction", schema);
