// Shared asset enums and request shapes used by the asset module.
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

export interface CreateAssetDto {
  locationId: string;
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
  status?: AssetStatus;
  criticality?: AssetCriticality;
  condition?: AssetCondition;
  ownership?: AssetOwnership;
  lastMaintenanceDate?: Date;
  nextMaintenanceDate?: Date;
  estimatedValue?: number;
  notes?: string;
}

export interface UpdateAssetDto {
  assetTag?: string;
  locationId?: string;
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

// Backward-compatible aliases for older module imports.
export type createAssetDto = CreateAssetDto;
export type updateAssetDto = UpdateAssetDto;
