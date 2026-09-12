import { Schema, model } from "mongoose";
import {
  AUDIT_ACTOR,
  AUDIT_OUTCOME,
  AUDIT_SEVERITY,
  AUDIT_ENTITY,
  AUDIT_ACTIONS,
} from "./audit.types.js";
import type { IAuditLog } from "./audit.types.js";


export const auditLogSchema = new Schema<IAuditLog>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      index: true,
    },

    facilityId: {
      type: Schema.Types.ObjectId,
      ref: "Facility",
      index: true,
    },

    actorType: {
      type: String,
      enum: AUDIT_ACTOR,
      default: "user",
      required: true,
    },

    actorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },

    targetUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },

    action: {
      type: String,
      enum: AUDIT_ACTIONS,
      required: true,
      index: true,
    },

    outcome: {
      type: String,
      enum: AUDIT_OUTCOME,
      default: "success",
    },

    severity: {
      type: String,
      enum: AUDIT_SEVERITY,
      default: "info",
    },

    entityType: {
      type: String,
      enum: AUDIT_ENTITY,
      required: true,
      index: true,
    },

    entityId: {
      type: Schema.Types.ObjectId,
      index: true,
    },

    oldValues: {
      type: Schema.Types.Mixed,
    },

    newValues: {
      type: Schema.Types.Mixed,
    },

    sessionMetadata: {
      type: Schema.Types.Mixed,
    },

    metadata: {
      type: Schema.Types.Mixed,
    },

    source: String,

    traceId: {
      type: String,
      index: true,
    },

    retentionUntil: {
      type: Date,
      required: true,
      index: { expires: 0 },
    },
  },
  {
    timestamps: true,
  },
);

auditLogSchema.index({
  organizationId: 1,
  createdAt: -1,
});

auditLogSchema.index({
  facilityId: 1,
  createdAt: -1,
});

auditLogSchema.index({
  actorId: 1,
  createdAt: -1,
});

auditLogSchema.index({
  targetUserId: 1,
  createdAt: -1,
});

auditLogSchema.index({
  entityType: 1,
  entityId: 1,
});

export const AuditLog = model<IAuditLog>("AuditLog", auditLogSchema);
