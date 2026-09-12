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

export const createQuotationRevisionSchema = z.object({
  quotationId: objectId,
  currency: z.string().length(3).transform((value) => value.toUpperCase()),
  lineItems: z.array(z.object({
    description: z.string().trim().min(1),
    quantity: z.number().positive(),
    unit: z.string().trim().min(1),
    unitPriceMinor: z.number().int().nonnegative(),
  })).min(1),
  taxAndFeesMinor: z.number().int().nonnegative().default(0),
  validUntil: z.coerce.date().optional(),
  terms: z.string().trim().max(5000).optional(),
  notes: z.string().trim().max(2000).optional(),
  revisionReason: z.string().trim().max(1000).optional(),
});
export type CreateQuotationRevisionInput = z.infer<typeof createQuotationRevisionSchema>;
