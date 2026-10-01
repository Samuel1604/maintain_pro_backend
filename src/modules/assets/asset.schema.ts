import { z } from "zod";

import {
  AssetCategory,
  AssetStatus,
  AssetCriticality,
  AssetCondition,
  AssetOwnership,
} from "./asset.types.js";

const createAssetBody = z.object({
  facilityId: z
    .string()
    .regex(/^[a-f\d]{24}$/i, "Invalid facility ID")
    .optional(),
  locationId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid location ID"),
  assetTag: z.string().min(1, "Asset tag is required"),
  name: z.string().min(1, "Asset name is required"),
  description: z.string().optional(),
  category: z.enum(AssetCategory),
  manufacturer: z.string().optional(),
  modelNumber: z.string().optional(),
  serialNumber: z.string().optional(),
  purchaseDate: z.coerce.date(),
  installationDate: z.coerce.date(),
  warrantyExpiry: z.coerce.date().optional(),
  status: z.enum(AssetStatus).optional(),
  criticality: z.enum(AssetCriticality).optional(),
  condition: z.enum(AssetCondition).optional(),
  ownership: z.enum(AssetOwnership).optional(),
  lastMaintenanceDate: z.coerce.date().optional(),
  nextMaintenanceDate: z.coerce.date().optional(),
  estimatedValue: z.coerce.number().finite().nonnegative(),
  currency: z
    .string()
    .regex(/^[A-Za-z]{3}$/, "Currency must be a 3-letter code")
    .transform((value) => value.toUpperCase())
    .optional(),
  notes: z.string().optional(),
});
export const createAsset = z.object({ body: createAssetBody });

export const listAssetSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  status: z.enum(AssetStatus).optional(),
  category: z.enum(AssetCategory).optional(),
  locationId: z
    .string()
    .regex(/^[a-f\d]{24}$/i)
    .optional(),
  facilityId: z
    .string()
    .regex(/^[a-f\d]{24}$/i)
    .optional(),
  sort: z.enum(["assetTag", "name", "createdAt", "-createdAt"]).default("-createdAt"),
});
export type ListAssetInput = z.infer<typeof listAssetSchema>;

const updateAssetBody = z.object({
  assetTag: z.string().min(1).optional(),
  name: z.string().min(1, "Asset name is required").optional(),
  locationId: z
    .string()
    .regex(/^[a-f\d]{24}$/i)
    .optional(),
  description: z.string().optional(),
  category: z.enum(AssetCategory).optional(),
  manufacturer: z.string().optional(),
  modelNumber: z.string().optional(),
  serialNumber: z.string().optional(),
  purchaseDate: z.coerce.date().optional(),
  installationDate: z.coerce.date().optional(),
  warrantyExpiry: z.coerce.date().optional(),
  status: z.enum(AssetStatus).optional(),
  criticality: z.enum(AssetCriticality).optional(),
  condition: z.enum(AssetCondition).optional(),
  ownership: z.enum(AssetOwnership).optional(),
  lastMaintenanceDate: z.coerce.date().optional(),
  nextMaintenanceDate: z.coerce.date().optional(),
  estimatedValue: z.number().optional(),
  currency: z
    .string()
    .regex(/^[A-Za-z]{3}$/)
    .transform((value) => value.toUpperCase())
    .optional(),
  notes: z.string().optional(),
});
export const updateAsset = z.object({ body: updateAssetBody });
