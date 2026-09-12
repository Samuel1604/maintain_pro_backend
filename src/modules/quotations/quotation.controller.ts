import { requestHandler } from "@/shared/utils/request.js";
import type { AuthRequest } from "@/shared/types/request.js";
import { createQuotationSchema, createQuotationRevisionSchema } from "./quotation.schema.js";
import { QuotationService } from "./quotation.service.js";

const service = new QuotationService();

export const createQuotation = requestHandler<AuthRequest>(async (req, res) => {
  const data = createQuotationSchema.parse(req.body);
  const result = await service.create(data, req.user);

  return res.created(result.data, result.message);
});

export const listQuotationsByApplication = requestHandler<
  AuthRequest<{ vendorApplicationId: string }>
>(async (req, res) => {
  const result = await service.listByApplication(
    req.params.vendorApplicationId,
    req.user,
  );

  return res.ok(result.data, result.message);
});
export const listVendorQuotations = requestHandler<AuthRequest>(async (req, res) => {
  const result = await service.listForVendor(req.user);
  return res.ok(result.data, result.message);
});
export const listOrganizationQuotations = requestHandler<AuthRequest>(async (req, res) => {
  const result = await service.listForOrganization(req.user);
  return res.ok(result.data, result.message);
});

export const updateQuotationStatus = requestHandler<AuthRequest<{ id: string }>>(async (req, res) => {
  const status = req.body.status as "under_review" | "accepted" | "rejected" | "withdrawn";
  const result = await service.updateStatus(req.params.id, status, req.user);
  return res.ok(result.data, result.message);
});

export const listQuotationRevisions = requestHandler<AuthRequest<{ quotationId: string }>>(async (req, res) => res.ok(await service.revisions(req.params.quotationId, req.user), "Quotation revisions retrieved successfully"));
export const createQuotationRevision = requestHandler<AuthRequest<{ quotationId: string }>>(async (req, res) => res.created(await service.createRevision(createQuotationRevisionSchema.parse({ ...req.body, quotationId: req.params.quotationId }), req.user), "Quotation revision created successfully"));
