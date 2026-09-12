import { z } from "zod";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ObjectId");
const quantity = z.number().positive();

export const createItemSchema = z.object({
  sku: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  categoryId: objectId.optional(),
  unitOfMeasure: z.string().trim().min(1).max(40),
  minimumStockLevel: z.number().nonnegative().default(0),
  reorderLevel: z.number().nonnegative().default(0),
  maximumStockLevel: z.number().nonnegative().optional(),
  preferredVendorId: objectId.optional(),
});
export const updateItemSchema = createItemSchema.partial();
export const createCategorySchema = z.object({ name: z.string().trim().min(1).max(120), description: z.string().trim().max(1000).optional() });
export const createStockLocationSchema = z.object({ name: z.string().trim().min(1).max(160), code: z.string().trim().max(50).optional(), description: z.string().trim().max(1000).optional(), facilityId: objectId.optional() });
export const updateStockLocationSchema = createStockLocationSchema.partial();
const idempotencyKey = z.string().trim().min(1).max(200).optional();
export const receiveSchema = z.object({ itemId: objectId, stockLocationId: objectId, quantity, reference: z.string().trim().max(200).optional(), notes: z.string().trim().max(1000).optional(), idempotencyKey });
export const reserveSchema = z.object({ itemId: objectId, stockLocationId: objectId, quantity, workOrderId: objectId.optional(), idempotencyKey });
export const issueSchema = z.object({ itemId: objectId, stockLocationId: objectId, quantity, workOrderId: objectId.optional(), reservationId: objectId.optional(), sourceTransactionId: objectId.optional(), reason: z.string().trim().max(500).optional(), idempotencyKey });
export const returnSchema = z.object({ originalTransactionId: objectId, quantity, reason: z.string().trim().max(500).optional(), idempotencyKey });
export const adjustSchema = z.object({ itemId: objectId, stockLocationId: objectId, quantity: z.number().refine((value) => value !== 0), reason: z.string().trim().min(1).max(500), idempotencyKey });
export const transferSchema = z.object({ itemId: objectId, sourceLocationId: objectId, destinationLocationId: objectId, quantity, reference: z.string().trim().max(200).optional(), notes: z.string().trim().max(1000).optional(), idempotencyKey });
export const releaseSchema = z.object({ reservationId: objectId });

export type CreateItemInput = z.infer<typeof createItemSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;
