import { Schema, model, Document, Types } from "mongoose";
import type { InventoryStatus } from "./inventory.types.js";

export interface IInventoryItem extends Document {
  organizationId: Types.ObjectId;
  sku: string;
  name: string;
  description?: string;
  categoryId?: Types.ObjectId;
  unitOfMeasure: string;
  status: InventoryStatus;
  minimumStockLevel: number;
  reorderLevel: number;
  maximumStockLevel?: number;
  preferredVendorId?: Types.ObjectId;
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<IInventoryItem>({
  organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
  sku: { type: String, required: true, trim: true, uppercase: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  categoryId: { type: Schema.Types.ObjectId, ref: "InventoryCategory" },
  unitOfMeasure: { type: String, required: true, trim: true, lowercase: true },
  status: { type: String, enum: ["active", "inactive"], default: "active", index: true },
  minimumStockLevel: { type: Number, required: true, min: 0, default: 0 },
  reorderLevel: { type: Number, required: true, min: 0, default: 0 },
  maximumStockLevel: { type: Number, min: 0 },
  preferredVendorId: { type: Schema.Types.ObjectId, ref: "Vendor" },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

schema.index({ organizationId: 1, sku: 1 }, { unique: true });
export const InventoryItem = model<IInventoryItem>("InventoryItem", schema);
