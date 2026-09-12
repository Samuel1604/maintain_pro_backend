import { Schema, model, Document, Types } from "mongoose";
import type { ContractAwardStatus } from "./contract-award.types.js";

export interface IContractAward extends Document {
  organizationId: Types.ObjectId;
  workOrderId: Types.ObjectId;
  vendorApplicationId: Types.ObjectId;
  vendorId: Types.ObjectId;
  quotationId?: Types.ObjectId;
  quotationRevisionId?: Types.ObjectId;
  slaAgreementId?: Types.ObjectId;
  awardedBy: Types.ObjectId;
  awardedAt: Date;
  effectiveAt?: Date;
  expiresAt?: Date;
  assignedVendorTechnicianId?: Types.ObjectId;
  notes?: string;
  status: ContractAwardStatus;
  createdAt: Date;
  updatedAt: Date;
}

const contractAwardSchema = new Schema<IContractAward>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    workOrderId: {
      type: Schema.Types.ObjectId,
      ref: "WorkOrder",
      required: true,
    },
    vendorApplicationId: {
      type: Schema.Types.ObjectId,
      ref: "VendorApplication",
      required: true,
    },
    vendorId: {
      type: Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
    },
    quotationId: {
      type: Schema.Types.ObjectId,
      ref: "Quotation",
    },
    slaAgreementId: {
      type: Schema.Types.ObjectId,
      ref: "SlaAgreement",
    },
    awardedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    awardedAt: {
      type: Date,
      default: Date.now,
    },
    effectiveAt: Date,
    expiresAt: Date,
    assignedVendorTechnicianId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    notes: String,
    status: {
      type: String,
      enum: ["draft", "pending_approval", "awarded", "active", "completed", "terminated", "cancelled"],
      default: "pending_approval",
    },
  },
  {
    timestamps: true,
  },
);

contractAwardSchema.index({ organizationId: 1, workOrderId: 1 });

export const ContractAward = model<IContractAward>(
  "ContractAward",
  contractAwardSchema,
);
