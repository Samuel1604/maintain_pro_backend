import { z } from "zod";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ObjectId");

export const createQuotationSchema = z.object({
  vendorApplicationId: objectId,
  laborCost: z.number().min(0),
  materialCost: z.number().min(0),
  estimatedDurationHours: z.number().positive(),
  notes: z.string().trim().max(2000).optional(),
});

export type CreateQuotationInput = z.infer<typeof createQuotationSchema>;
