import { requestHandler } from "@/shared/utils/request.js";
import type { AuthRequest } from "@/shared/types/request.js";
import { createVendorApplicationSchema, applicationStatusSchema } from "./vendor-application.schema.js";
import { VendorApplicationService } from "./vendor-application.service.js";

const service = new VendorApplicationService();

export const createVendorApplication = requestHandler<AuthRequest>(
  async (req, res) => {
    const data = createVendorApplicationSchema.parse(req.body);
    const result = await service.create(data, req.user);

    return res.created(result.data, result.message);
  },
);

export const listVendorApplicationsForWorkOrder = requestHandler<
  AuthRequest<{ workOrderId: string }>
>(async (req, res) => {
  const result = await service.listByWorkOrder(req.params.workOrderId, req.user);

  return res.ok(result.data, result.message);
});
export const listVendorApplications = requestHandler<AuthRequest>(async (req, res) => { const result = await service.listForVendor(req.user); return res.ok(result.data, result.message); });
export const updateVendorApplicationStatus = requestHandler<AuthRequest<{ id: string }>>(async (req, res) => { const result = await service.updateStatus(req.params.id, applicationStatusSchema.parse(req.body).status as "under_review" | "rejected" | "awarded", req.user); return res.ok(result.data, result.message); });
export const withdrawVendorApplication = requestHandler<AuthRequest<{ id: string }>>(async (req, res) => { const result = await service.withdraw(req.params.id, req.user); return res.ok(result.data, result.message); });
