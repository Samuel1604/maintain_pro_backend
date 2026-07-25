import { z } from "zod";

import {
  AssetCategory,
  AssetStatus,
  AssetCriticality,
  AssetCondition,
  AssetOwnership,
} from "./asset.types.js";

export const createAsset = z.object({
  assetTag: z.string().min(1, "Asset tag is required"),
  name: z.string().min(1, "Asset name is required"),
  description: z.string().optional(),
  category: z.enum(AssetCategory),
  manufacturer: z.string().optional(),
  modelNumber: z.string().optional(),
  serialNumber: z.string().optional(),
  purchaseDate: z.date().optional(),
  installationDate: z.date().optional(),
  warrantyExpiry: z.date().optional(),
  status: z.enum(AssetStatus),
  criticality: z.enum(AssetCriticality).optional(),
  condition: z.enum(AssetCondition),
  ownership: z.enum(AssetOwnership),
  lastMaintenanceDate: z.date().optional(),
  nextMaintenanceDate: z.date().optional(),
  estimatedValue: z.number().optional(),
  notes: z.string().optional(),
});

export const updateAsset = z.object({
  assetTag: z.string().min(1, "Asset tag is required"),
  name: z.string().min(1, "Asset name is required"),
  description: z.string().optional(),
  category: z.enum(AssetCategory).optional(),
  manufacturer: z.string().optional(),
  modelNumber: z.string().optional(),
  serialNumber: z.string().optional(),
  purchaseDate: z.date().optional(),
  installationDate: z.date().optional(),
  warrantyExpiry: z.date().optional(),
  status: z.enum(AssetStatus).optional(),
  criticality: z.enum(AssetCriticality).optional(),
  condition: z.enum(AssetCondition).optional(),
  ownership: z.enum(AssetOwnership).optional(),
  lastMaintenanceDate: z.date().optional(),
  nextMaintenanceDate: z.date().optional(),
  estimatedValue: z.number().optional(),
  notes: z.string().optional(),
});
