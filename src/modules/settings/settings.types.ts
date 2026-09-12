import type { Document, Types } from "mongoose";

export interface IUserSettings extends Document {
  userId: Types.ObjectId;
  language: string;
  timezone: string;
  dateFormat: "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD";
  timeFormat: "12h" | "24h";
  accessibility: { reducedMotion: boolean; highContrast: boolean; screenReaderAnnouncements: boolean };
  createdAt: Date;
  updatedAt: Date;
}

export interface IOrganizationSettings extends Document {
  organizationId: Types.ObjectId;
  timezone: string;
  locale: string;
  currency: string;
  defaultWorkOrderPriority: "low" | "medium" | "high" | "critical";
  defaultServiceRequestPriority: "low" | "medium" | "high" | "critical";
  notificationPolicies: Record<string, boolean>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IVendorSettings extends Document {
  vendorId: Types.ObjectId;
  timezone: string;
  locale: string;
  marketplaceAvailable: boolean;
  profileVisible: boolean;
  autoApply: boolean;
  minimumAnnualContractValue?: number;
  maximumDistanceKm?: number;
  contractTypes: { pm: boolean; emergency: boolean; modernization: boolean; audits: boolean };
  createdAt: Date;
  updatedAt: Date;
}
