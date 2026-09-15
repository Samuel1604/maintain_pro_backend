import { z } from "zod";

const createLocationBodySchema = z.object({
  facilityId: z.string().min(1, "Facility ID is required"),
  name: z.string().trim().min(2, "Location name must be at least 2 characters"),
  type: z.enum(["BUILDING", "FLOOR", "AREA", "ROOM", "ZONE", "OTHER"]),
  code: z.string().optional(),
  floor: z.string().optional(),
  roomNumber: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(["active", "inactive"]).default("active"),
  parentId: z.string().nullable().optional(),
});

export const createLocationSchema = z.object({ body: createLocationBodySchema });
export const updateLocationSchema = z.object({ body: createLocationBodySchema.partial().omit({ facilityId: true }) });

export type CreateLocationInput = z.infer<typeof createLocationBodySchema>;
export type UpdateLocationInput = z.infer<typeof createLocationBodySchema.partial().omit({ facilityId: true })>;
