import { z } from "zod";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ObjectId");

export const createContractAwardSchema = z.object({
  vendorApplicationId: objectId,
  quotationId: objectId.optional(),
  slaAgreementId: objectId.optional(),
  assignedVendorTechnicianId: objectId.optional(),
  notes: z.string().trim().max(2000).optional(),
});

export type CreateContractAwardInput = z.infer<
  typeof createContractAwardSchema
>;
