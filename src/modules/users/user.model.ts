import { Schema, model } from "mongoose";
import type { IUser } from "./user.types.js";
import { ACCOUNT_STATUS } from "@/shared/constants/account-status.js";
import { AUTH_PROVIDERS } from "@/shared/constants/auth-providers.js";
import { ROLES } from "@/shared/constants/roles.js";

const userSchema = new Schema<IUser>(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
    },

    lastName: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },

    password: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: ACCOUNT_STATUS,
      default: ACCOUNT_STATUS.PENDING_VERIFICATION,
    },

    phone: String,

    avatar: String,

    provider: {
      type: String,
      enum: AUTH_PROVIDERS,
      default: AUTH_PROVIDERS.LOCAL,
    },

    providers: {
      local: {
        type: Boolean,
        default: true,
      },
      google: {
        type: Boolean,
        default: false,
      },
      linkedin: {
        type: Boolean,
        default: false,
      },
      apple: {
        type: Boolean,
        default: false,
      },
    },
    role: {
      type: String,
      enum: ROLES,
    },

    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
    },

    facilityId: {
      type: Schema.Types.ObjectId,
      ref: "facility",
    },

    vendorId: {
      type: Schema.Types.ObjectId,
      ref: "Vendor",
    },

    isVerified: {
      type: Boolean,
      default: false,
    },
    emailVerifiedAt: Date,
    phoneVerified: {
      type: Boolean,
      default: false,
    },
    lastLoginAt: {
      type: Date,
    },
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    lastPasswordChangeAt: {
      type: Date,
    },
    lastEmailChangeAt: {
      type: Date,
    },
    passwordResetAt: {
      type: Date,
    },
    lockedUntil: {
      type: Date,
    },
    googleId: String,
    appleId: String,
    linkedinId: String,
  },
  {
    timestamps: true,
  },
);

export const User = model<IUser>("User", userSchema);
