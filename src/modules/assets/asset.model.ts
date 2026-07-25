import { Schema, model, Document, Types } from "mongoose";
import * as Type from "./asset.types.js";

export interface IAsset extends Document {
  organizationId: Types.ObjectId;
  facilityId: Types.ObjectId;

  assetTag: string;

  name: string;

  description?: string;

  category: Type.AssetCategory;

  manufacturer?: string;
  modelNumber?: string;
  serialNumber?: string;

  purchaseDate?: Date;
  installationDate?: Date;

  warrantyExpiry?: Date;

  status: Type.AssetStatus;

  criticality?: Type.AssetCriticality;

  condition: Type.AssetCondition;

  ownership: Type.AssetOwnership;

  lastMaintenanceDate?: Date;
  nextMaintenanceDate?: Date;

  estimatedValue?: number;

  notes?: string;

  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const assetSchema = new Schema<IAsset>({
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
  assetTag: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },

  manufacturer: {
    type: String,
  },
  modelNumber: {
    type: String,
  },
  serialNumber: {
    type: String,
  },
  purchaseDate: {
    type: Date,
    required: true,
  },
  installationDate: {
    type: Date,
    required: true,
  },
  warrantyExpiry: {
    type: Date,
  },
  status: {
    type: String,
    enum: Type.AssetStatus,
    default: Type.AssetStatus.ACTIVE,
  },
  category: {
    type: String,
    enum: Type.AssetCategory,
    default: Type.AssetCategory.HARDWARE,
  },
  criticality: {
    type: String,
    enum: Type.AssetCriticality,
    default: Type.AssetCriticality.LOW,
  },
  condition: {
    type: String,
    enum: Type.AssetCondition,
    default: Type.AssetCondition.GOOD,
  },
  ownership: {
    type: String,
    enum: Type.AssetOwnership,
    default: Type.AssetOwnership.OWNED,
  },
  lastMaintenanceDate: {
    type: Date,
  },
  nextMaintenanceDate: {
    type: Date,
  },
  estimatedValue: {
    type: Number,
    required: true,
  },
  notes: {
    type: String,
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
});

export const Asset = model<IAsset>("Asset", assetSchema);
