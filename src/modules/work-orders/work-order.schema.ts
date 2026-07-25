import { z } from "zod";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ObjectId");

export const createWorkOrderSchema = z
  .object({
    organizationId: objectId,
    facilityId: objectId,
    assetId: objectId.optional(),
    title: z.string().trim().min(2),
    description: z.string().trim().min(5),
    priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
    serviceCategory: z.string().trim().min(2),
    fulfillmentType: z.enum(["internal", "marketplace"]),
    technicianId: objectId.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.fulfillmentType === "internal" && !data.technicianId) {
      ctx.addIssue({
        code: "custom",
        path: ["technicianId"],
        message: "technicianId is required for internal work orders",
      });
    }

    if (data.fulfillmentType === "marketplace" && data.technicianId) {
      ctx.addIssue({
        code: "custom",
        path: ["technicianId"],
        message: "Marketplace work orders cannot include technicianId",
      });
    }
  });

export const updateProgressSchema = z.object({
  status: z.enum(["in_progress", "pending_completion"]),
});

export const rejectCompletionSchema = z.object({
  rejectionReason: z.string().trim().min(3),
});

export type CreateWorkOrderInput = z.infer<typeof createWorkOrderSchema>;
export type UpdateProgressInput = z.infer<typeof updateProgressSchema>;
export type RejectCompletionInput = z.infer<typeof rejectCompletionSchema>;
