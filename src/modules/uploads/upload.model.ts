import { Schema, model, Document, Types } from "mongoose";

export type UploadCategory = "image" | "document" | "video" | "audio" | "other";
export type UploadStatus = "pending" | "available" | "failed" | "deleting";
export type UploadPurpose = "profile-avatar" | "organization-logo" | "vendor-logo" | "work-order-attachment" | "service-request-attachment" | "contract-document" | "asset-import" | "general-attachment";

export interface IUpload extends Document {
  actorId: Types.ObjectId; // User executing the upload
  organizationId?: Types.ObjectId;
  vendorId?: Types.ObjectId;
  facilityId?: Types.ObjectId;

  originalName: string;
  mimeType: string;
  size: number;
  category: UploadCategory;
  purpose: UploadPurpose;

  providerPublicId: string;
  url: string;
  secureUrl: string;
  status: UploadStatus;

  width?: number;
  height?: number;
  duration?: number;

  createdAt: Date;
  updatedAt: Date;
}

const uploadSchema = new Schema<IUpload>(
  {
    actorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      index: true,
    },
    vendorId: {
      type: Schema.Types.ObjectId,
      ref: "Vendor",
      index: true,
    },
    facilityId: {
      type: Schema.Types.ObjectId,
      ref: "Facility",
      index: true,
    },
    originalName: {
      type: String,
      required: true,
      trim: true,
    },
    mimeType: {
      type: String,
      required: true,
      trim: true,
    },
    size: {
      type: Number,
      required: true,
    },
    category: {
      type: String,
      enum: ["image", "document", "video", "audio", "other"],
      required: true,
    },
    purpose: {
      type: String,
      enum: ["profile-avatar", "organization-logo", "vendor-logo", "work-order-attachment", "service-request-attachment", "contract-document", "asset-import", "general-attachment"],
      required: true,
      index: true,
    },
    providerPublicId: {
      type: String,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    secureUrl: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "available", "failed", "deleting"],
      default: "available",
      required: true,
    },
    width: {
      type: Number,
    },
    height: {
      type: Number,
    },
    duration: {
      type: Number,
    },
  },
  {
    timestamps: true,
  },
);

export const Upload = model<IUpload>("Upload", uploadSchema);
