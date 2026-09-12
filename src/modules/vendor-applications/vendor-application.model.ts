import { Schema, model, Document, Types } from "mongoose";
import type { VendorApplicationStatus } from "./vendor-application.types.js";

export interface IVendorApplication extends Document {
  organizationId: Types.ObjectId;
  workOrderId: Types.ObjectId;
  vendorId: Types.ObjectId;
  appliedBy: Types.ObjectId;
  note?: string;
  status: VendorApplicationStatus;
  createdAt: Date;
  updatedAt: Date;
}

const vendorApplicationSchema = new Schema<IVendorApplication>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    workOrderId: {
      type: Schema.Types.ObjectId,
      ref: "WorkOrder",
      required: true,
    },
    vendorId: {
      type: Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
    },
    appliedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    note: String,
    status: {
      type: String,
      enum: ["submitted", "under_review", "withdrawn", "rejected", "awarded"],
      default: "submitted",
    },
  },
  {
    timestamps: true,
  },
);

vendorApplicationSchema.index(
  { workOrderId: 1, vendorId: 1 },
  { unique: true },
);

export const VendorApplication = model<IVendorApplication>(
  "VendorApplication",
  vendorApplicationSchema,
);
