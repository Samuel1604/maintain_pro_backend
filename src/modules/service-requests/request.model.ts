import { Schema, model, Document, Types } from "mongoose";

export interface IServiceRequest extends Document {
  organizationId: Types.ObjectId;
  facilityId: Types.ObjectId;
  locationId: Types.ObjectId;
  assetId: Types.ObjectId;
  requestedBy: Types.ObjectId;
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "critical";
  serviceCategory: string;
  status: "pending" | "approved" | "rejected";
  approvalDecision?: "approved" | "rejected";
  approvedBy?: Types.ObjectId;
  approvedAt?: Date;
  rejectedBy?: Types.ObjectId;
  rejectedAt?: Date;
  rejectionReason?: string;
  workOrderId?: Types.ObjectId;
  sourceWorkOrderId?: Types.ObjectId;
  rating?: number;
  feedback?: string;
  ratedAt?: Date;
  attachmentUploadIds?: Types.ObjectId[];
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
    locationId: { type: Schema.Types.ObjectId, ref: "Location", required: true, index: true },
    assetId: {
      type: Schema.Types.ObjectId,
      ref: "Asset",
      required: true,
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
    approvalDecision: { type: String, enum: ["approved", "rejected"] },
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
    sourceWorkOrderId: {
      type: Schema.Types.ObjectId,
      ref: "WorkOrder",
      index: true,
    },
    rating: { type: Number, min: 1, max: 5 }, feedback: { type: String, maxlength: 2000 }, ratedAt: Date,
    attachmentUploadIds: [{ type: Schema.Types.ObjectId, ref: "Upload" }],
  },
  {
    timestamps: true,
  },
);

serviceRequestSchema.index({ organizationId: 1, createdAt: -1, status: 1 });

export const ServiceRequest = model<IServiceRequest>(
  "ServiceRequest",
  serviceRequestSchema,
);
