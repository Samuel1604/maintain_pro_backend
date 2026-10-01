import type { IAsset } from "../asset.model.js";
import type { AssetResponse } from "./asset.dto.js";
import { toIsoString, toObjectIdString } from "@/shared/validators/index.js";

export const assetMapper = {
  toAssetResponse(asset: IAsset): AssetResponse {
    return {
      id: toObjectIdString(asset._id)!,
      assetTag: asset.assetTag,
      // Use the browser route so scanning the QR code opens the asset detail page.
      // The legacy route resolves the user's role and redirects to the correct portal.
      qrCode: `${process.env.FRONTEND_URL || process.env.CLIENT_URL || "http://localhost:3000"}/assets/${encodeURIComponent(asset.assetTag)}`,
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
      currency: asset.currency ?? "NGN",
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
