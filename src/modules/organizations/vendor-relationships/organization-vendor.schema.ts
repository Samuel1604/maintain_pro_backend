import { z } from "zod";
const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ObjectId");
export const vendorListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  status: z
    .enum(["pending", "active", "suspended", "inactive", "removed"])
    .optional(),
  serviceCategory: z.string().trim().optional(),
  sort: z
    .enum(["createdAt", "-createdAt", "name", "-name"])
    .default("-createdAt"),
});
export const vendorStatusSchema = z.object({
  status: z.enum(["pending", "active", "suspended", "inactive", "removed"]),
});
export const facilityVendorParamsSchema = z.object({
  facilityId: objectId,
  vendorId: objectId,
});
export type VendorListInput = z.infer<typeof vendorListSchema>;
export type VendorStatusInput = z.infer<typeof vendorStatusSchema>;
