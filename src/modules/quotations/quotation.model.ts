import { Schema, model, Document, Types } from "mongoose";
import type { QuotationStatus } from "./quotation.types.js";

export interface IQuotation extends Document {
  organizationId: Types.ObjectId;
  vendorApplicationId: Types.ObjectId;
  workOrderId: Types.ObjectId;
  vendorId: Types.ObjectId;
  submittedBy: Types.ObjectId;
  quotationNumber: string;
  currency: string;
  subtotalMinor: number;
  taxAndFeesMinor: number;
  totalMinor: number;
  currentRevision: number;
  validUntil?: Date;
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
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
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
    quotationNumber: { type: String, required: true, unique: true, index: true },
    currency: { type: String, required: true, uppercase: true, trim: true },
    subtotalMinor: { type: Number, required: true, min: 0 },
    taxAndFeesMinor: { type: Number, required: true, min: 0, default: 0 },
    totalMinor: { type: Number, required: true, min: 0 },
    currentRevision: { type: Number, required: true, min: 1, default: 1 },
    validUntil: Date,
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
      enum: ["draft", "submitted", "under_review", "accepted", "rejected", "withdrawn", "expired"],
      default: "submitted",
    },
  },
  {
    timestamps: true,
  },
);

export const Quotation = model<IQuotation>("Quotation", quotationSchema);
