import { Schema, model, Document, Types } from "mongoose";

export interface IServiceRequest extends Document {
  organizationId: Types.ObjectId;
  facilityId: Types.ObjectId;
  assetId?: Types.ObjectId;
  requestedBy: Types.ObjectId;
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "critical";
  serviceCategory: string;
  status: "pending" | "approved" | "rejected";
  approvedBy?: Types.ObjectId;
  approvedAt?: Date;
  rejectedBy?: Types.ObjectId;
  rejectedAt?: Date;
  rejectionReason?: string;
  workOrderId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const serviceRequestSchema = new Schema<IServiceRequest>(
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
    assetId: {
      type: Schema.Types.ObjectId,
      ref: "Asset",
    },
    requestedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
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
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    approvedAt: Date,
    rejectedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    rejectedAt: Date,
    rejectionReason: String,
    workOrderId: {
      type: Schema.Types.ObjectId,
      ref: "WorkOrder",
    },
  },
  {
    timestamps: true,
  },
);

export const ServiceRequest = model<IServiceRequest>(
  "ServiceRequest",
  serviceRequestSchema,
);
