import { requestHandler } from "@/shared/utils/request.js";
import type { AuthRequest } from "@/shared/types/request.js";
import { createQuotationSchema } from "./quotation.schema.js";
import { QuotationService } from "./quotation.service.js";

const service = new QuotationService();

export const createQuotation = requestHandler<AuthRequest>(async (req, res) => {
  const data = createQuotationSchema.parse(req.body);
  const quotation = await service.create(data, req.user);

  return res.status(201).json({
    success: true,
    data: quotation,
  });
});

export const listQuotationsByApplication = requestHandler<
  AuthRequest<{ vendorApplicationId: string }>
>(async (req, res) => {
  const quotations = await service.listByApplication(
    req.params.vendorApplicationId,
  );

  return res.status(200).json({
    success: true,
    data: quotations,
  });
});
