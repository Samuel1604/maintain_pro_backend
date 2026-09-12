import { z } from "zod";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ObjectId");

export const createWorkOrderSchema = z
  .object({
    organizationId: objectId,
    facilityId: objectId,
    assetId: objectId,
    locationId: objectId.optional(),
    title: z.string().trim().min(2),
    description: z.string().trim().min(5),
    priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
    serviceCategory: z.string().trim().min(2),
    dueDate: z.coerce.date().optional(),
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

export const transitionWorkOrderSchema = z.object({
  status: z.enum(["in_progress", "on_hold", "pending_completion"]),
  reason: z.string().trim().min(3).optional(),
}).superRefine((data, ctx) => {
  if (data.status === "on_hold" && !data.reason) {
    ctx.addIssue({
      code: "custom",
      path: ["reason"],
      message: "reason is required when placing a work order on hold",
    });
  }
});

export const assignWorkOrderSchema = z.object({
  technicianId: objectId,
});

export const rejectCompletionSchema = z.object({
  rejectionReason: z.string().trim().min(3),
});
export const requestInformationSchema = z.object({ note: z.string().trim().min(3) });

export type CreateWorkOrderInput = z.infer<typeof createWorkOrderSchema>;
export type UpdateProgressInput = z.infer<typeof updateProgressSchema>;
export type AssignWorkOrderInput = z.infer<typeof assignWorkOrderSchema>;
export type RejectCompletionInput = z.infer<typeof rejectCompletionSchema>;
export type RequestInformationInput = z.infer<typeof requestInformationSchema>;

export const updateWorkOrderSchema = z.object({
  title: z.string().trim().min(2).optional(),
  description: z.string().trim().min(5).optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  serviceCategory: z.string().trim().min(2).optional(),
  dueDate: z.coerce.date().nullable().optional(),
  assetId: objectId.nullable().optional(),
  locationId: objectId.nullable().optional(),
});
export type UpdateWorkOrderInput = z.infer<typeof updateWorkOrderSchema>;

export const vendorAcceptSchema = z.object({ proposedSchedule: z.coerce.date().optional() });
export const vendorRejectSchema = z.object({ reason: z.string().trim().min(3) });
export const completionInvoiceSchema = z.object({
  invoiceNumber: z.string().trim().min(1), amount: z.number().min(0),
  currency: z.string().trim().min(3).max(3).optional(), notes: z.string().optional(), dueDate: z.coerce.date().optional(),
});
