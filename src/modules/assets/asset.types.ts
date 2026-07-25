// src/modules/assets/asset.types.js
// TODO: Define asset-related TypeScript types and interfaces
export enum AssetStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  UNDER_MAINTENANCE = "under_maintenance",
  RETIRED = "retired",
}

export enum AssetCriticality {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

export enum AssetCategory {
  HARDWARE = "hardware",
  SOFTWARE = "software",
  INFRASTRUCTURE = "infrastructure",
  OTHER = "other",
}

export enum AssetOwnership {
  OWNED = "owned",
  RENTED = "rented",
  LEASED = "leased",
}

export enum AssetCondition {
  GOOD = "good",
  FAIR = "fair",
  POOR = "poor",
}

export interface createAssetDto {
  assetTag: string;
  name: string;
  description?: string;
  category: AssetCategory;
  manufacturer?: string;
  modelNumber?: string;
  serialNumber?: string;
  purchaseDate?: Date;
  installationDate?: Date;
  warrantyExpiry?: Date;
  status: AssetStatus;
  criticality?: AssetCriticality;
  condition: AssetCondition;
  ownership: AssetOwnership;
  lastMaintenanceDate?: Date;
  nextMaintenanceDate?: Date;
  estimatedValue?: number;
  notes?: string;
}

export interface updateAssetDto {
  assetTag: string;
  name?: string;
  description?: string;
  category?: AssetCategory;
  manufacturer?: string;
  modelNumber?: string;
  serialNumber?: string;
  purchaseDate?: Date;
  installationDate?: Date;
  warrantyExpiry?: Date;
  status?: AssetStatus;
  criticality?: AssetCriticality;
  condition?: AssetCondition;
  ownership?: AssetOwnership;
  lastMaintenanceDate?: Date;
  nextMaintenanceDate?: Date;
  estimatedValue?: number;
  notes?: string;
}
