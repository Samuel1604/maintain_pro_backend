import type { Types, Document } from "mongoose";
import type { AuthProvider } from "@/shared/constants/auth-providers.js";
import type { SessionMetadata } from "@/shared/types/session.types.js";
import { AUTH_LOG_ACTIONS } from "@/modules/audit/actions/auth-actions.js";

export interface IAuthLog extends Document {
  userId?: Types.ObjectId;

  email?: string;

  provider?: AuthProvider;

  action: AuthActions;

  outcome: "success" | "failure";

  failureReason?: string;

  metadata?: Record<string, unknown>;

  sessionMetadata: Partial<SessionMetadata>;

  createdAt: Date;
  updatedAt: Date;
}

type ValueOf<T> = T[keyof T];
export type AuthActions =
  | ValueOf<typeof AUTH_LOG_ACTIONS>

export const AUTH_ACTIONS = {
  ...AUTH_LOG_ACTIONS
}

export interface CreateAuthLogDto {
  userId?: Types.ObjectId;

  email: string;

  provider: AuthProvider;

  failureReason?: string;

  action: AuthActions;

  outcome: "success" | "failure";

  sessionMetadata?: Partial<SessionMetadata>;

  metadata?: Record<string, unknown>;
}


