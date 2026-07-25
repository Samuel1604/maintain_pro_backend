import { Schema, model } from "mongoose";
import { ROLES } from "@/shared/constants/roles.js";
import type { IInvitation } from "./invitation.types.js";
import { InvitationStatus, InvitationType } from "./invitation.types.js";

const invitationSchema = new Schema<IInvitation>(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    role: {
      type: String,
      enum: Object.values(ROLES),
      required: true,
    },

    invitationType: {
      type: String,
      enum: Object.values(InvitationType),
      required: true,
    },

    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    resentFromInvitationId: {
      type: Schema.Types.ObjectId,
      ref: "Invitation",
    },

    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
    },

    facilityId: {
      type: Schema.Types.ObjectId,
      ref: "Facility",
    },

    vendorId: {
      type: Schema.Types.ObjectId,
      ref: "Vendor",
    },

    tokenHash: {
      type: String,
      required: true,
    },

    expiresAt: {
      type: Date,
      required: true,
    },

    acceptedAt: Date,

    acceptedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    revokedAt: Date,

    revokedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    revokeReason: String,

    resendCount: {
      type: Number,
      default: 0,
    },

    lastSentAt: {
      type: Date,
      default: Date.now,
    },

    status: {
      type: String,
      enum: Object.values(InvitationStatus),
      default: InvitationStatus.PENDING,
    },
  },
  {
    timestamps: true,
  },
);

invitationSchema.index({
  email: 1,
  status: 1,
});

invitationSchema.index({
  organizationId: 1,
});

invitationSchema.index({
  facilityId: 1,
});

invitationSchema.index({
  vendorId: 1,
});

invitationSchema.index({
  expiresAt: 1,
});

invitationSchema.index({
  tokenHash: 1,
});

export const Invitation = model<IInvitation>("Invitation", invitationSchema);
