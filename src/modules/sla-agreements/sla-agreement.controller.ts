import { requestHandler } from "@/shared/utils/request.js";
import type { AuthRequest } from "@/shared/types/request.js";
import { createSlaAgreementSchema } from "./sla-agreement.schema.js";
import { SlaAgreementService } from "./sla-agreement.service.js";

const service = new SlaAgreementService();

export const createSlaAgreement = requestHandler<AuthRequest>(
  async (req, res) => {
    const data = createSlaAgreementSchema.parse(req.body);
    const result = await service.create(data, req.user);

    return res.created(result.data, result.message);
  },
);

export const listSlaAgreementsByApplication = requestHandler<
  AuthRequest<{ vendorApplicationId: string }>
>(async (req, res) => {
  const result = await service.listByApplication(
    req.params.vendorApplicationId,
    req.user,
  );

  return res.ok(result.data, result.message);
});
export const listSlaAgreementsForVendor = requestHandler<AuthRequest>(async (req, res) => {
  const result = await service.listForVendor(req.user);
  return res.ok(result.data, result.message);
});

export const updateSlaAgreementStatus = requestHandler<AuthRequest<{ id: string }>>(async (req, res) => {
  const result = await service.updateStatus(req.params.id, req.body.status, req.user);
  return res.ok(result.data, result.message);
});
