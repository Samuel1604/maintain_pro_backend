import type { DeviceInfo } from "./device.types.js";

export interface SessionMetadata extends DeviceInfo {
  sessionId?: string;
  familyId?: string;
  parentTokenHash?: string;
  replacedByTokenHash?: string;
}
