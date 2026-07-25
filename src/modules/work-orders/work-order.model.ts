import { Schema, model, Document, Types } from "mongoose";
import {
  FULFILLMENT_TYPE,
  type FulfillmentType,
  WORK_ORDER_STATUS,
  type WorkOrderStatus,
} from "@/shared/constants/work-order-status.js";

export interface IWorkOrder extends Document {
  organizationId: Types.ObjectId;
  facilityId: Types.ObjectId;
  serviceRequestId?: Types.ObjectId;
  assetId?: Types.ObjectId;
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "critical";
  serviceCategory: string;
  fulfillmentType: FulfillmentType;
  status: WorkOrderStatus;
  assignedTechnicianId?: Types.ObjectId;
  assignedVendorId?: Types.ObjectId;
  assignedVendorTechnicianId?: Types.ObjectId;
  approvedBy?: Types.ObjectId;
  approvedAt?: Date;
  completedAt?: Date;
  rejectionReason?: string;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const workOrderSchema = new Schema<IWorkOrder>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    facilityId: {
      type: Schema.Types.ObjectId,
      ref: "Facility",
      required: true,
    },
    serviceRequestId: {
      type: Schema.Types.ObjectId,
      ref: "ServiceRequest",
    },
    assetId: {
      type: Schema.Types.ObjectId,
      ref: "Asset",
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },
    serviceCategory: {
      type: String,
      required: true,
      trim: true,
    },
    fulfillmentType: {
      type: String,
      enum: Object.values(FULFILLMENT_TYPE),
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(WORK_ORDER_STATUS),
      required: true,
    },
    assignedTechnicianId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    assignedVendorId: {
      type: Schema.Types.ObjectId,
      ref: "Vendor",
    },
    assignedVendorTechnicianId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    approvedAt: Date,
    completedAt: Date,
    rejectionReason: String,
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    reviewedAt: Date,
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

workOrderSchema.index({
  status: 1,
  serviceCategory: 1,
  organizationId: 1,
  facilityId: 1,
});

export const WorkOrder = model<IWorkOrder>("WorkOrder", workOrderSchema);
