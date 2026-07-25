import type { Document, Types } from "mongoose";

export enum SecurityAlertType {
  ACCOUNT_LOCKED = "account_locked",

  TOKEN_REUSE = "token_reuse",

  NEW_DEVICE_LOGIN = "new_device_login",

  NEW_LOCATION_LOGIN = "new_location_login",

  PASSWORD_CHANGED = "password_changed",

  PASSWORD_RESET = "password_reset",

  EMAIL_CHANGED = "email_changed",

  OAUTH_PROVIDER_LINKED = "oauth_provider_linked",

  OAUTH_PROVIDER_UNLINKED = "oauth_provider_unlinked",
}

export enum SecurityAlertStatus {
  UNREAD = "unread",

  READ = "read",

  DISMISSED = "dismissed",
}

export interface ISecurityAlert extends Document {
  userId: Types.ObjectId;

  type: SecurityAlertType;

  status: SecurityAlertStatus;

  ipAddress?: string;

  userAgent?: string;

  country?: string;

  city?: string;

  metadata?: Record<string, unknown>;

  readAt?: Date;

  createdAt: Date;

  updatedAt: Date;
}
