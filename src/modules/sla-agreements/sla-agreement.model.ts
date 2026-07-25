import { Schema, model, Document, Types } from "mongoose";
import type { SlaAgreementStatus } from "./sla-agreement.types.js";

export interface ISlaAgreement extends Document {
  vendorApplicationId: Types.ObjectId;
  workOrderId: Types.ObjectId;
  vendorId: Types.ObjectId;
  responseTimeHours: number;
  resolutionTimeHours: number;
  warrantyPeriodDays: number;
  penaltyTerms?: string;
  notes?: string;
  status: SlaAgreementStatus;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const slaAgreementSchema = new Schema<ISlaAgreement>(
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
    responseTimeHours: {
      type: Number,
      required: true,
      min: 0,
    },
    resolutionTimeHours: {
      type: Number,
      required: true,
      min: 0,
    },
    warrantyPeriodDays: {
      type: Number,
      required: true,
      min: 0,
    },
    penaltyTerms: String,
    notes: String,
    status: {
      type: String,
      enum: ["draft", "proposed", "accepted", "rejected"],
      default: "proposed",
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

export const SlaAgreement = model<ISlaAgreement>(
  "SlaAgreement",
  slaAgreementSchema,
);
