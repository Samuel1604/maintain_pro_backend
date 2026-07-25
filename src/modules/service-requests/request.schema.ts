import { z } from "zod";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ObjectId");

export const approveServiceRequestSchema = z
  .object({
    fulfillmentType: z.enum(["internal", "marketplace"]),
    technicianId: objectId.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.fulfillmentType === "internal" && !data.technicianId) {
      ctx.addIssue({
        code: "custom",
        path: ["technicianId"],
        message: "technicianId is required for the internal technician path",
      });
    }

    if (data.fulfillmentType === "marketplace" && data.technicianId) {
      ctx.addIssue({
        code: "custom",
        path: ["technicianId"],
        message: "Vendor marketplace approval cannot include technicianId",
      });
    }
  });

export type ApproveServiceRequestInput = z.infer<
  typeof approveServiceRequestSchema
>;

export const rejectServiceRequestSchema = z.object({
  rejectionReason: z.string().trim().min(3),
});

export type RejectServiceRequestInput = z.infer<
  typeof rejectServiceRequestSchema
>;

export const createServiceRequestSchema = z.object({
  organizationId: objectId,
  facilityId: objectId,
  assetId: objectId.optional(),
  title: z.string().trim().min(2),
  description: z.string().trim().min(5),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  serviceCategory: z.string().trim().min(2),
});

export type CreateServiceRequestInput = z.infer<
  typeof createServiceRequestSchema
>;
