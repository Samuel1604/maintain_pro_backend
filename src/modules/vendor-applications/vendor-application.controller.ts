import { requestHandler } from "@/shared/utils/request.js";
import type { AuthRequest } from "@/shared/types/request.js";
import { createVendorApplicationSchema } from "./vendor-application.schema.js";
import { VendorApplicationService } from "./vendor-application.service.js";

const service = new VendorApplicationService();

export const createVendorApplication = requestHandler<AuthRequest>(
  async (req, res) => {
    const data = createVendorApplicationSchema.parse(req.body);
    const application = await service.create(data, req.user);

    return res.status(201).json({
      success: true,
      data: application,
    });
  },
);

export const listVendorApplicationsForWorkOrder = requestHandler<
  AuthRequest<{ workOrderId: string }>
>(async (req, res) => {
  const applications = await service.listByWorkOrder(req.params.workOrderId);

  return res.status(200).json({
    success: true,
    data: applications,
  });
});
