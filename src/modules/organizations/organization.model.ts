import { Schema, model } from "mongoose";
import type { IOrganization } from "./organization.types.js";


const organizationSchema = new Schema<IOrganization>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    industry: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
    },

    website: {
      type: String,
    },

    address: {
      type: String,
      required: true,
    },

    logo: String,

    plan: {
      type: String,
      enum: ["free", "starter", "professional", "enterprise"],
      default: "free",
    },

    subscriptionStatus: {
      type: String,
      enum: ["trial", "active", "past_due", "cancelled"],
    },

    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active",
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    facilityLimit: {
      type: Number,
      default: 1,
    },

    facilityManagerLimit: {
      type: Number,
      default: 1,
    },

    vendorMarketplaceEnabled: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

export const Organization = model<IOrganization>(
  "Organization",
  organizationSchema,
);
