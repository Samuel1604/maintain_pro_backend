import { Schema, model, Document, Types } from "mongoose";

export interface ILocation extends Document {
  organizationId: Types.ObjectId;
  facilityId: Types.ObjectId;
  name: string;
  type: "BUILDING" | "FLOOR" | "AREA" | "ROOM" | "ZONE" | "OTHER";
  parentId?: Types.ObjectId;
  code?: string;
  floor?: string;
  roomNumber?: string;
  description?: string;
  status: "active" | "inactive";
  createdAt: Date;
  updatedAt: Date;
}

const locationSchema = new Schema<ILocation>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    facilityId: {
      type: Schema.Types.ObjectId,
      ref: "Facility",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: { type: String, enum: ["BUILDING", "FLOOR", "AREA", "ROOM", "ZONE", "OTHER"], required: true },
    parentId: { type: Schema.Types.ObjectId, ref: "Location", index: true },
    code: {
      type: String,
      trim: true,
      uppercase: true,
    },
    floor: {
      type: String,
      trim: true,
    },
    roomNumber: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

// Compound index to ensure location name or code is unique within a single facility
locationSchema.index({ facilityId: 1, name: 1 }, { unique: true });
locationSchema.index({ organizationId: 1, facilityId: 1, status: 1 });

export const Location = model<ILocation>("Location", locationSchema);
