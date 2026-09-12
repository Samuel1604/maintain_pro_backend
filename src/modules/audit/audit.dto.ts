import type { Types } from "mongoose";

import type {
  AuditAction,
  AuditActor,
  AuditEntity,
  AuditOutcome,
  AuditSeverity,
} from "./audit.types.ts";

import type { SessionMetadata } from "@/shared/types/session.types.js";

export interface CreateAuditLogDto {
  organizationId?: Types.ObjectId;

  facilityId?: Types.ObjectId;

  actorType?: AuditActor;

  actorId?: Types.ObjectId;

  targetUserId?: Types.ObjectId;

  action: AuditAction;

  outcome?: AuditOutcome;

  severity?: AuditSeverity;

  entityType: AuditEntity;

  entityId?: Types.ObjectId;

  oldValues?: Record<string, unknown>;

  newValues?: Record<string, unknown>;

  metadata?: Record<string, unknown>;

  sessionMetadata?: SessionMetadata

  source?: string;

  traceId?: string;

  retentionUntil?: Date;
}
