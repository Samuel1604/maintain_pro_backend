import { Schema, model } from "mongoose";
import type { IVendor } from "./vendor.types.js";

const vendorSchema = new Schema<IVendor>(
  {
    name: {
      type: String,
      required: true,
    },
    slug: { type: String, required: true, unique: true, lowercase: true, index: true },

    email: {
      type: String,
      required: true,
      lowercase: true,
    },

    phone: {
      type: String,
      required: true,
    },

    website: String,
    logo: String,

    address: {
      street: String,
      city: String,
      state: String,
      postalCode: String,
      country: String,
    },
    companyRegistrationNumber: String,

    serviceCategories: [
      {
        type: String,
      },
    ],

    coverageRadiusKm: {
      type: Number,
      min: 0,
    },

    baseCoordinates: {
      type: {
        type: String,
        enum: ["Point"],
      },
      coordinates: {
        type: [Number],
      },
    },

    certifications: [
      {
        type: String,
      },
    ],

    isVerified: {
      type: Boolean,
      default: false,
    },

    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active",
    },

    plan: {
      type: String,
      enum: ["free", "starter", "professional"],
      default: "free"
    },

    subscriptionStatus: {
      type: String,
      enum: ["trial", "active", "past_due", "cancelled" ]
    },
    applicationLimit: {
      type: Number,
      default: 1
    },
    averageRating: {
      type: Number,
      default: 0
    },
    completedJobs: {
      type: Number,
      default: 0
    },
    verificationBadge: {
      type: String,
      enum: ["none", "verified", "premium"]
    }
  },
  {
    timestamps: true,
  },
);

vendorSchema.index({ baseCoordinates: "2dsphere" });

export const Vendor = model<IVendor>("Vendor", vendorSchema);
