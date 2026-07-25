import type { Document, Types } from "mongoose";
import type { SessionMetadata } from "@/shared/types/session.types.js";
import { AUTH_AUDIT_ACTIONS } from "../auth/auth.constants.js";
import { USER_AUDIT_ACTIONS } from "../users/user.constants.js";
import { ORGANIZATION_AUDIT_ACTIONS } from "../organizations/organization.constants.js";
import { AUTH_LOG_ACTIONS } from "./actions/auth-actions.js";
import { VENDOR_AUDIT_ACTIONS } from "../vendors/vendor.constants.js";
import { INVITATION_AUDIT_ACTIONS } from "../invitations/invitation.constants.js";
import { SECURITY_ACTIONS } from "./actions/security-actions.js";

export const AUDIT_ACTOR = {
  USER: "user",
  SYSTEM: "system",
  VENDOR: "vendor",
  SERVICE: "service",
} as const;

export type AuditActor = (typeof AUDIT_ACTOR)[keyof typeof AUDIT_ACTOR];

export const AUDIT_OUTCOME = {
  SUCCESS: "success",
  FAILURE: "failure",
} as const; // {"success", "failure"};

export type AuditOutcome = (typeof AUDIT_OUTCOME)[keyof typeof AUDIT_OUTCOME];

export const AUDIT_SEVERITY = {
  INFO: "info",
  WARNING: "warning",
  CRITICAL: "critical",
} as const; // {"info" , "warning" , "critical"};

export type AuditSeverity =
  (typeof AUDIT_SEVERITY)[keyof typeof AUDIT_SEVERITY];

export const AUDIT_ENTITY = {
  USER: "user",
  ORGANIZATION: "organization",
  FACILITY: "facility",
  VENDOR: "vendor",
  ASSET: "asset",
  WORK_ORDER: "work_order",
  INVITATION: "invitation",
  SESSION: "session",
} as const;

export type AuditEntity = (typeof AUDIT_ENTITY)[keyof typeof AUDIT_ENTITY];

type ValueOf<T> = T[keyof T];
export type AuditAction =
  | ValueOf<typeof AUTH_AUDIT_ACTIONS>
  | ValueOf<typeof USER_AUDIT_ACTIONS>
  | ValueOf<typeof ORGANIZATION_AUDIT_ACTIONS>
  | ValueOf<typeof AUTH_LOG_ACTIONS>
  | ValueOf<typeof SECURITY_ACTIONS>
  | ValueOf<typeof VENDOR_AUDIT_ACTIONS>
  | ValueOf<typeof INVITATION_AUDIT_ACTIONS>;

export const AUDIT_ACTIONS = {
  ...AUTH_AUDIT_ACTIONS,
  ...USER_AUDIT_ACTIONS,
  ...ORGANIZATION_AUDIT_ACTIONS,
  ...AUTH_LOG_ACTIONS,
  ...SECURITY_ACTIONS,
  ...VENDOR_AUDIT_ACTIONS,
  ...INVITATION_AUDIT_ACTIONS,
} as const;

export interface IAuditLog extends Document {
  organizationId?: Types.ObjectId;

  facilityId?: Types.ObjectId;

  actorType: AuditActor;

  actorId?: Types.ObjectId;

  targetUserId?: Types.ObjectId;

  action: AuditAction;

  outcome: AuditOutcome;

  severity: AuditSeverity;

  entityType: AuditEntity;

  entityId?: Types.ObjectId;

  oldValues?: Record<string, unknown>;

  newValues?: Record<string, unknown>;

  sessionMetadata: SessionMetadata;

  metadata?: Record<string, unknown>;

  source?: string;

  traceId?: string;

  createdAt: Date;

  updatedAt: Date;
}
