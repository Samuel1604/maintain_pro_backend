import type { IAsset } from "../asset.model.js";
import type { AssetResponse } from "./asset.dto.js";
import { toIsoString, toObjectIdString } from "@/shared/validators/index.js";

export const assetMapper = {
  toAssetResponse(asset: IAsset): AssetResponse {
    return {
      id: toObjectIdString(asset._id)!,
      assetTag: asset.assetTag,
      qrCode: `maintainpro://assets/${encodeURIComponent(asset.assetTag)}`,
      name: asset.name,
      description: asset.description,
      category: asset.category,
      manufacturer: asset.manufacturer,
      modelNumber: asset.modelNumber,
      serialNumber: asset.serialNumber,
      purchaseDate: toIsoString(asset.purchaseDate),
      installationDate: toIsoString(asset.installationDate),
      warrantyExpiry: toIsoString(asset.warrantyExpiry),
      status: asset.status,
      criticality: asset.criticality,
      condition: asset.condition,
      ownership: asset.ownership,
      lastMaintenanceDate: toIsoString(asset.lastMaintenanceDate),
      nextMaintenanceDate: toIsoString(asset.nextMaintenanceDate),
      estimatedValue: asset.estimatedValue,
      notes: asset.notes,

      organizationId: toObjectIdString(asset.organizationId),
      facilityId: toObjectIdString(asset.facilityId),
      locationId: toObjectIdString(asset.locationId),
      createdBy: toObjectIdString(asset.createdBy),

      createdAt: toIsoString(asset.createdAt),
      updatedAt: toIsoString(asset.updatedAt),
    };
  },
};

export const toAssetResponse = (asset: IAsset) => assetMapper.toAssetResponse(asset);
