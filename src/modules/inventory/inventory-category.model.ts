import { Schema, model, Document, Types } from "mongoose";

export interface IInventoryCategory extends Document {
  organizationId: Types.ObjectId;
  name: string;
  description?: string;
  status: "active" | "inactive";
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<IInventoryCategory>({
  organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
  name: { type: String, required: true, trim: true },
  description: String,
  status: { type: String, enum: ["active", "inactive"], default: "active" },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });

schema.index({ organizationId: 1, name: 1 }, { unique: true });
export const InventoryCategory = model<IInventoryCategory>("InventoryCategory", schema);
