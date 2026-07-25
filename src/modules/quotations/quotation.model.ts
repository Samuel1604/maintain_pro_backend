import { Schema, model, Document, Types } from "mongoose";
import type { QuotationStatus } from "./quotation.types.js";

export interface IQuotation extends Document {
  vendorApplicationId: Types.ObjectId;
  workOrderId: Types.ObjectId;
  vendorId: Types.ObjectId;
  submittedBy: Types.ObjectId;
  laborCost: number;
  materialCost: number;
  estimatedDurationHours: number;
  notes?: string;
  status: QuotationStatus;
  createdAt: Date;
  updatedAt: Date;
}

const quotationSchema = new Schema<IQuotation>(
  {
    vendorApplicationId: {
      type: Schema.Types.ObjectId,
      ref: "VendorApplication",
      required: true,
    },
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
    submittedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    laborCost: {
      type: Number,
      required: true,
      min: 0,
    },
    materialCost: {
      type: Number,
      required: true,
      min: 0,
    },
    estimatedDurationHours: {
      type: Number,
      required: true,
      min: 0,
    },
    notes: String,
    status: {
      type: String,
      enum: ["submitted", "revised", "accepted", "rejected"],
      default: "submitted",
    },
  },
  {
    timestamps: true,
  },
);

export const Quotation = model<IQuotation>("Quotation", quotationSchema);
