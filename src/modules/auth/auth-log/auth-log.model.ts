import { Schema, model } from "mongoose";
import type { IAuthLog } from "./auth-log.types.js";
import { AUTH_PROVIDERS } from "@/shared/constants/auth-providers.js";
import { AUTH_ACTIONS } from "./auth-log.types.js";

const authLogSchema = new Schema<IAuthLog>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      index: true,
    },

    provider: {
      type: String,
      enum: AUTH_PROVIDERS,
      required: true,
    },

    action: {
      type: String,
      enum: AUTH_ACTIONS,
      required: true,
    },

    outcome: {
      type: String,
      enum: ["success", "failure"],
      required: true,
    },

    sessionMetadata: {
      ipAddress: String,

      userAgent: String,

      browser: String,
      browserVersion: String,

      os: String,
      osVersion: String,

      deviceType: String,

      country: String,
      city: String,
      timezone: String,
    },

    metadata: {
      type: Schema.Types.Mixed,
    },

    failureReason: String,

  },
  {
    timestamps: true,
  },
);

export const AuthLogModel = model<IAuthLog>("AuthLog", authLogSchema);
