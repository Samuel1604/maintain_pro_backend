import { Schema, model } from "mongoose";
import type { IOrganization } from "./organization.types.js";


const organizationSchema = new Schema<IOrganization>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    slug: { type: String, required: true, unique: true, lowercase: true, index: true },

    industry: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
      unique: true,
    },

    phone: {
      type: String,
      required: true,
    },

    website: {
      type: String,
    },

    address: {
      street: String,
      city: String,
      state: String,
      postalCode: String,
      country: String,
    },

    logo: String,

    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active",
      index: true,
    },

    isVerified: {
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
