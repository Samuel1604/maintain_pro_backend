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
  assetId: Types.ObjectId;
  locationId?: Types.ObjectId;
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "critical";
  serviceCategory: string;
  dueDate?: Date;
  fulfillmentType: FulfillmentType;
  status: WorkOrderStatus;
  assignedTechnicianId?: Types.ObjectId;
  assignedVendorId?: Types.ObjectId;
  assignedVendorTechnicianId?: Types.ObjectId;
  vendorOfferStatus?: "pending_acceptance" | "accepted" | "rejected";
  vendorRejectReason?: string;
  proposedSchedule?: Date;
  approvedBy?: Types.ObjectId;
  approvedAt?: Date;
  completedAt?: Date;
  rejectionReason?: string;
  approvalNotes?: string;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  createdBy: Types.ObjectId;
  statusHistory?: {
    status: string;
    changedAt: Date;
    changedBy: Types.ObjectId;
    reason?: string;
  }[];
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
      required: true,
    },
    locationId: { type: Schema.Types.ObjectId, ref: "Location" },
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
    dueDate: Date,
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
    vendorOfferStatus: { type: String, enum: ["pending_acceptance", "accepted", "rejected"] },
    vendorRejectReason: String,
    proposedSchedule: Date,
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    approvedAt: Date,
    completedAt: Date,
  rejectionReason: String,
    approvalNotes: String,
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
    statusHistory: [{
      status: { type: String, required: true },
      changedAt: { type: Date, default: Date.now },
      changedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
      reason: String,
    }],
  },
  {
    timestamps: true,
    optimisticConcurrency: true,
  },
);

workOrderSchema.index({
  status: 1,
  serviceCategory: 1,
  organizationId: 1,
  facilityId: 1,
});
workOrderSchema.index({ organizationId: 1, createdAt: -1 });
workOrderSchema.index({ organizationId: 1, status: 1, createdAt: -1 });
workOrderSchema.index({ assignedVendorId: 1, createdAt: -1 });
workOrderSchema.index({ organizationId: 1, createdAt: -1, status: 1, priority: 1 });
workOrderSchema.index({ organizationId: 1, dueDate: 1, status: 1 });
// A service request can be approved concurrently by two requests, but it may
// only ever produce one work order. Sparse semantics preserve standalone work
// orders that do not originate from a service request.
workOrderSchema.index({ serviceRequestId: 1 }, { unique: true, sparse: true });

export const WorkOrder = model<IWorkOrder>("WorkOrder", workOrderSchema);
