import { Types } from "mongoose";
import type { DeviceInfo } from "@/shared/types/device.types.js";

export interface CreateRefreshTokenDto extends DeviceInfo {
  userId: Types.ObjectId;

  sessionId: string;

  tokenHash: string;

  familyId: string;

  expiresAt: Date;

  parentTokenHash?: string;

  replacedByTokenHash?: string;

  lastUsedAt: Date;
}

export interface SessionResponse {
  id: string;

  browser?: string;
  browserVersion?: string;

  os?: string;
  osVersion?: string;

  deviceType?: string;

  country?: string;
  city?: string;
  timezone?: string;

  ipAddress: string;

  lastUsedAt: Date;

  createdAt: Date;

  current: boolean;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

export interface SessionDto {
  id: string;

  browser?: string;

  os?: string;

  deviceType?: string;

  ipAddress?: string;

  country?: string;

  city?: string;

  lastUsedAt?: Date;

  expiresAt: Date;

  createdAt: Date;

  current: boolean;
}