import { requestHandler } from "@/shared/utils/request.js";
import type { AuthRequest } from "@/shared/types/request.js";
import { createSlaAgreementSchema } from "./sla-agreement.schema.js";
import { SlaAgreementService } from "./sla-agreement.service.js";

const service = new SlaAgreementService();

export const createSlaAgreement = requestHandler<AuthRequest>(
  async (req, res) => {
    const data = createSlaAgreementSchema.parse(req.body);
    const agreement = await service.create(data, req.user);

    return res.status(201).json({
      success: true,
      data: agreement,
    });
  },
);

export const listSlaAgreementsByApplication = requestHandler<
  AuthRequest<{ vendorApplicationId: string }>
>(async (req, res) => {
  const agreements = await service.listByApplication(
    req.params.vendorApplicationId,
  );

  return res.status(200).json({
    success: true,
    data: agreements,
  });
});
