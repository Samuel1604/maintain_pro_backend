import { Schema, model, Document, Types } from "mongoose";

export interface IFacility extends Document {
  organizationId: Types.ObjectId;
  name: string;
  address: string;
  coordinates: {
    type: "Point";
    coordinates: [number, number];
  };
  city: string;
  state: string;
  country: string;
  createdAt: Date;
  updatedAt: Date;
}

const facilitySchema = new Schema<IFacility>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      required: true,
    },
    coordinates: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
        required: true,
      },
      coordinates: {
        type: [Number],
        required: true,
      },
    },
    city: {
      type: String,
      required: true,
    },
    state: {
      type: String,
      required: true,
    },
    country: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

facilitySchema.index({ coordinates: "2dsphere" });

export const Facility = model<IFacility>("Facility", facilitySchema);
