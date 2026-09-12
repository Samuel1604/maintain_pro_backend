import { z } from "zod";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ObjectId");

export const createVendorApplicationSchema = z.object({
  workOrderId: objectId,
  note: z.string().trim().max(1000).optional(),
});

export type CreateVendorApplicationInput = z.infer<
  typeof createVendorApplicationSchema
>;
export const applicationStatusSchema = z.object({ status: z.enum(["under_review", "rejected", "awarded", "withdrawn"]) });
