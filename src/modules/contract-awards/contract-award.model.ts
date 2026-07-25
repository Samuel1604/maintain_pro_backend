import { Schema, model, Document, Types } from "mongoose";
import type { ContractAwardStatus } from "./contract-award.types.js";

export interface IContractAward extends Document {
  workOrderId: Types.ObjectId;
  vendorApplicationId: Types.ObjectId;
  vendorId: Types.ObjectId;
  quotationId?: Types.ObjectId;
  slaAgreementId?: Types.ObjectId;
  awardedBy: Types.ObjectId;
  awardedAt: Date;
  assignedVendorTechnicianId?: Types.ObjectId;
  notes?: string;
  status: ContractAwardStatus;
  createdAt: Date;
  updatedAt: Date;
}

const contractAwardSchema = new Schema<IContractAward>(
  {
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
    assignedVendorTechnicianId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    notes: String,
    status: {
      type: String,
      enum: ["awarded", "cancelled"],
      default: "awarded",
    },
  },
  {
    timestamps: true,
  },
);

contractAwardSchema.index({ workOrderId: 1 }, { unique: true });

export const ContractAward = model<IContractAward>(
  "ContractAward",
  contractAwardSchema,
);
