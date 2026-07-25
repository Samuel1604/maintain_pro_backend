import type { Types } from "mongoose";
import type { SessionMetadata } from "@/shared/types/session.types.js";
import type { SecurityAlertType } from "./security.types.js";

export interface CreateSecurityAlertDto {
  userId: Types.ObjectId;

  type: SecurityAlertType;

  sessionMetadata?: SessionMetadata;

  metadata?: Record<string, unknown>;
}
