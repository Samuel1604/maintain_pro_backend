import type { AssetStatus, AssetCriticality, AssetCategory, AssetOwnership, AssetCondition } from "../asset.types.js";

export interface AssetResponse {
  id: string;
  assetTag: string;
  qrCode: string;
  name: string;
  description?: string;
  category: AssetCategory;
  manufacturer?: string;
  modelNumber?: string;
  serialNumber?: string;
  purchaseDate?: string;
  installationDate?: string;
  warrantyExpiry?: string;
  status: AssetStatus;
  criticality?: AssetCriticality;
  condition: AssetCondition;
  ownership: AssetOwnership;
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
  estimatedValue?: number;
  notes?: string;

  organizationId?: string;
  facilityId?: string;
  locationId?: string;
  createdBy?: string;

  createdAt?: string;
  updatedAt?: string;
}

export const toAssetResponse = (id: string) => id;
