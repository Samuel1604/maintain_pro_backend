import { Schema, model } from "mongoose";
import {
  SecurityAlertStatus,
  SecurityAlertType,
  type ISecurityAlert,
} from "./security.types.js";

const securityAlertSchema = new Schema<ISecurityAlert>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    type: {
      type: String,
      enum: Object.values(SecurityAlertType),
      required: true,
    },

    status: {
      type: String,
      enum: Object.values(SecurityAlertStatus),
      default: SecurityAlertStatus.UNREAD,
    },

    ipAddress: String,

    userAgent: String,

    country: String,

    city: String,

    metadata: Schema.Types.Mixed,

    readAt: Date,
  },
  {
    timestamps: true,
  },
);

securityAlertSchema.index({
  userId: 1,
  createdAt: -1,
});

securityAlertSchema.index({
  userId: 1,
  status: 1,
});

export const SecurityAlert = model<ISecurityAlert>(
  "SecurityAlert",
  securityAlertSchema,
);
