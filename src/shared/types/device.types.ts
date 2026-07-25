export interface DeviceInfo {
  ipAddress: string;

  userAgent: string;

  browser?: string;
  browserVersion?: string;

  os?: string;
  osVersion?: string;

  deviceType?: string;

  country?: string;
  city?: string;
  timezone?: string;
}

export interface ParsedDevice {
  browser?: string;
  browserVersion?: string;

  os?: string;
  osVersion?: string;

  deviceType?: string;
}