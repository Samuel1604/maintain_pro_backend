import { Schema, model, Document, Types } from "mongoose";

export interface IFacility extends Document {
  organizationId: Types.ObjectId;
  name: string;
  address: {
    street: string;
    city: string;
    state: string;
    postalCode?: string;
    country: string;
  };
  coordinates: {
    type: "Point";
    coordinates: [number, number];
  };
  status: "active" | "inactive" | "suspended";
  description?: string;
  managerName?: string;
  primaryPhone?: string;
  emergencyContact?: string;
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const facilitySchema = new Schema<IFacility>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      street: {
        type: String,
        required: true,
      },
      city: {
        type: String,
        required: true,
      },
      state: {
        type: String,
        required: true,
      },
      postalCode: {
        type: String,
      },
      country: {
        type: String,
        required: true,
      },
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
    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active",
      required: true,
      index: true,
    },
    description: {
      type: String,
    },
    managerName: {
      type: String,
      trim: true,
    },
    primaryPhone: {
      type: String,
      trim: true,
    },
    emergencyContact: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  },
);

// Indexes for common queries
facilitySchema.index({ coordinates: "2dsphere" });
facilitySchema.index({ organizationId: 1, status: 1 });

export const Facility = model<IFacility>("Facility", facilitySchema);
