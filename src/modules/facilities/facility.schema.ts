import { z } from "zod";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ObjectId");

export const createFacilitySchema = z.object({
  organizationId: objectId,
  name: z.string().trim().min(2),
  address: z.string().trim().min(3),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  city: z.string().trim().min(2),
  state: z.string().trim().min(2),
  country: z.string().trim().min(2),
});

export type CreateFacilityInput = z.infer<typeof createFacilitySchema>;
