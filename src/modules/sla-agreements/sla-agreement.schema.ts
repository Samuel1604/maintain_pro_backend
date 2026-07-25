import { z } from "zod";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ObjectId");

export const createSlaAgreementSchema = z.object({
  vendorApplicationId: objectId,
  responseTimeHours: z.number().positive(),
  resolutionTimeHours: z.number().positive(),
  warrantyPeriodDays: z.number().min(0),
  penaltyTerms: z.string().trim().max(2000).optional(),
  notes: z.string().trim().max(2000).optional(),
});

export type CreateSlaAgreementInput = z.infer<
  typeof createSlaAgreementSchema
>;
