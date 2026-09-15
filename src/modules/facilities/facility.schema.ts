import { z } from "zod";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ObjectId");

const addressSchema = z.object({
  street: z.string().trim().min(3, "Street must be at least 3 characters"),
  city: z.string().trim().min(2, "City must be at least 2 characters"),
  state: z.string().trim().min(2, "State must be at least 2 characters"),
  postalCode: z.string().trim().optional(),
  country: z.string().trim().min(2, "Country must be at least 2 characters"),
});

// ─── Create Facility ──────────────────────────────────────────────────────────

export const createFacilitySchema = z.object({
  organizationId: objectId,
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  address: addressSchema,
  latitude: z.number().min(-90, "Latitude must be between -90 and 90").max(90),
  longitude: z.number().min(-180, "Longitude must be between -180 and 180").max(180),
  description: z.string().trim().optional(),
  managerName: z.string().trim().optional(),
  primaryPhone: z.string().trim().optional(),
  emergencyContact: z.string().trim().optional(),
});

export type CreateFacilityInput = z.infer<typeof createFacilitySchema>;

// ─── Update Facility ──────────────────────────────────────────────────────────

export const updateFacilitySchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").optional(),
  address: addressSchema.partial().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  description: z.string().trim().optional().nullable(),
  managerName: z.string().trim().optional().nullable(),
  primaryPhone: z.string().trim().optional().nullable(),
  emergencyContact: z.string().trim().optional().nullable(),
  status: z.enum(["active", "inactive", "suspended"]).optional(),
});

export type UpdateFacilityInput = z.infer<typeof updateFacilitySchema>;

// ─── List Facilities Query ─────────────────────────────────────────────────────

export const listFacilitiesSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  status: z.enum(["active", "inactive", "suspended"]).optional(),
  sort: z.enum(["name", "createdAt", "-createdAt"]).optional().default("-createdAt"),
  search: z.string().trim().optional(),
});

export type ListFacilitiesInput = z.infer<typeof listFacilitiesSchema>;
