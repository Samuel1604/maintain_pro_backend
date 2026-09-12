import type { Document, Types } from "mongoose";
import type { SessionMetadata } from "@/shared/types/session.types.js";
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
  PROCUREMENT: "procurement",
  INVENTORY: "inventory",
} as const;

export type AuditEntity = (typeof AUDIT_ENTITY)[keyof typeof AUDIT_ENTITY];

type ValueOf<T> = T[keyof T];
export type AuditAction =
  | ValueOf<typeof USER_AUDIT_ACTIONS>
  | ValueOf<typeof ORGANIZATION_AUDIT_ACTIONS>
  | ValueOf<typeof AUTH_LOG_ACTIONS>
  | ValueOf<typeof SECURITY_ACTIONS>
  | ValueOf<typeof VENDOR_AUDIT_ACTIONS>
  | ValueOf<typeof INVITATION_AUDIT_ACTIONS>
  | ValueOf<typeof PROCUREMENT_AUDIT_ACTIONS>
  | ValueOf<typeof INVENTORY_AUDIT_ACTIONS>;

export const PROCUREMENT_AUDIT_ACTIONS = {
  APPLICATION_SUBMITTED: "procurement.application_submitted",
  APPLICATION_STATUS_CHANGED: "procurement.application_status_changed",
  APPLICATION_WITHDRAWN: "procurement.application_withdrawn",
  QUOTATION_SUBMITTED: "procurement.quotation_submitted",
  QUOTATION_REVISION_CREATED: "procurement.quotation_revision_created",
  QUOTATION_ACCEPTED: "procurement.quotation_accepted",
  QUOTATION_REJECTED: "procurement.quotation_rejected",
  SLA_PROPOSED: "procurement.sla_proposed",
  SLA_ACCEPTED: "procurement.sla_accepted",
  SLA_ACTIVATED: "procurement.sla_activated",
  SLA_TERMINATED: "procurement.sla_terminated",
  AWARD_CREATED: "procurement.award_created",
  AWARD_ACTIVATED: "procurement.award_activated",
  AWARD_TERMINATED: "procurement.award_terminated",
  AWARD_RENEWED: "procurement.award_renewed",
  AWARD_WORK_ORDER_ASSOCIATED: "procurement.award_work_order_associated",
} as const;

export const INVENTORY_AUDIT_ACTIONS = {
  ITEM_CREATED: "inventory.item_created",
  ITEM_UPDATED: "inventory.item_updated",
  ITEM_DEACTIVATED: "inventory.item_deactivated",
  LOCATION_CREATED: "inventory.location_created",
  STOCK_RECEIVED: "inventory.stock_received",
  STOCK_RESERVED: "inventory.stock_reserved",
  RESERVATION_RELEASED: "inventory.reservation_released",
  STOCK_ISSUED: "inventory.stock_issued",
  STOCK_CONSUMED: "inventory.stock_consumed",
  STOCK_RETURNED: "inventory.stock_returned",
  STOCK_ADJUSTED: "inventory.stock_adjusted",
  STOCK_TRANSFERRED: "inventory.stock_transferred",
} as const;

export const AUDIT_ACTIONS = {
  ...USER_AUDIT_ACTIONS,
  ...ORGANIZATION_AUDIT_ACTIONS,
  ...AUTH_LOG_ACTIONS,
  ...SECURITY_ACTIONS,
  ...VENDOR_AUDIT_ACTIONS,
  ...INVITATION_AUDIT_ACTIONS,
  ...PROCUREMENT_AUDIT_ACTIONS,
  ...INVENTORY_AUDIT_ACTIONS,
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

  /** MongoDB TTL deadline. Security events receive a longer retention window. */
  retentionUntil: Date;
}
