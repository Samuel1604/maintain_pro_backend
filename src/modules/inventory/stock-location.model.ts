import { Schema, model, Document, Types } from "mongoose";

export interface IStockLocation extends Document {
  organizationId: Types.ObjectId;
  facilityId?: Types.ObjectId;
  name: string;
  code?: string;
  description?: string;
  status: "active" | "inactive";
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<IStockLocation>({
  organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
  facilityId: { type: Schema.Types.ObjectId, ref: "Facility", index: true },
  name: { type: String, required: true, trim: true },
  code: { type: String, trim: true, uppercase: true },
  description: String,
  status: { type: String, enum: ["active", "inactive"], default: "active", index: true },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

schema.index({ organizationId: 1, code: 1 }, { unique: true, sparse: true });
export const StockLocation = model<IStockLocation>("StockLocation", schema);
