import { Schema, model, Document, Types } from "mongoose";
import type { ReservationStatus } from "./inventory.types.js";

export interface IInventoryReservation extends Document {
  organizationId: Types.ObjectId;
  itemId: Types.ObjectId;
  stockLocationId: Types.ObjectId;
  quantity: number;
  consumedQuantity: number;
  workOrderId?: Types.ObjectId;
  status: ReservationStatus;
  requestedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<IInventoryReservation>({
  organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
  itemId: { type: Schema.Types.ObjectId, ref: "InventoryItem", required: true },
  stockLocationId: { type: Schema.Types.ObjectId, ref: "StockLocation", required: true },
  quantity: { type: Number, required: true, min: 0 },
  consumedQuantity: { type: Number, required: true, min: 0, default: 0 },
  workOrderId: { type: Schema.Types.ObjectId, ref: "WorkOrder", index: true },
  status: { type: String, enum: ["requested", "reserved", "consumed", "released", "rejected"], default: "reserved", index: true },
  requestedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });

export const InventoryReservation = model<IInventoryReservation>("InventoryReservation", schema);
