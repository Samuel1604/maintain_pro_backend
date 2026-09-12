import { requestHandler } from "@/shared/utils/request.js";
import type { AuthRequest } from "@/shared/types/request.js";
import { WorkOrderService } from "./work-order.service.js";
import {
  createWorkOrderSchema,
  rejectCompletionSchema,
  requestInformationSchema,
  updateProgressSchema,
  updateWorkOrderSchema,
  assignWorkOrderSchema,
  transitionWorkOrderSchema,
} from "./work-order.schema.js";

const service = new WorkOrderService();

export const listWorkOrders = requestHandler<AuthRequest>(async (req, res) => { const page = Math.max(1, Number(req.query.page) || 1); const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20)); return res.ok(await service.list(req.user, { page, limit, cursor: typeof req.query.cursor === "string" ? req.query.cursor : undefined, status: typeof req.query.status === "string" ? req.query.status : undefined, priority: typeof req.query.priority === "string" ? req.query.priority : undefined, search: typeof req.query.search === "string" ? req.query.search : undefined }), "Work orders retrieved"); });
export const listFinanceApprovals = requestHandler<AuthRequest>(async (req, res) => { const page = Math.max(1, Number(req.query.page) || 1); const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20)); return res.ok(await service.list(req.user, { page, limit, status: "pending_completion" }), "Pending finance approvals retrieved"); });
export const listVendorWorkOrders = requestHandler<AuthRequest>(async (req, res) => { const page = Math.max(1, Number(req.query.page) || 1); const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20)); return res.ok(await service.listForVendor(req.user, { page, limit }), "Vendor work orders retrieved"); });
export const getWorkOrder = requestHandler<AuthRequest<{ id: string }>>(async (req, res) => res.ok(await service.get(req.params.id, req.user), "Work order retrieved"));
export const updateWorkOrder = requestHandler<AuthRequest<{ id: string }>>(async (req, res) => res.ok(await service.update(req.params.id, updateWorkOrderSchema.parse(req.body), req.user), "Work order updated"));
export const archiveWorkOrder = requestHandler<AuthRequest<{ id: string }>>(async (req, res) => res.ok(await service.archive(req.params.id, req.user), "Work order archived"));
export const assignWorkOrder = requestHandler<AuthRequest<{ id: string }>>(async (req, res) => res.ok(await service.assign(req.params.id, assignWorkOrderSchema.parse(req.body), req.user), "Work order assigned"));
export const listVendorCandidates = requestHandler<AuthRequest<{ id: string }>>(async (req, res) => res.ok(await service.listVendorCandidates(req.params.id, req.user), "Vendor candidates retrieved"));
export const transitionWorkOrder = requestHandler<AuthRequest<{ id: string }>>(async (req, res) => {
  const data = transitionWorkOrderSchema.parse(req.body);
  return res.ok(await service.transition(req.params.id, data.status, req.user, data.reason), "Work order status updated");
});
export const listTechnicianCandidates = requestHandler<AuthRequest<{ id: string }>>(async (req, res) => res.ok(await service.listTechnicianCandidates(req.params.id, req.user), "Technician candidates retrieved"));

export const createWorkOrder = requestHandler<AuthRequest>(async (req, res) => {
  const data = createWorkOrderSchema.parse(req.body);
  const result = await service.create(data, req.user);

  return res.created(result.data, result.message);
});

export const listOpenMarketplaceWorkOrders = requestHandler<AuthRequest>(
  async (req, res) => {
    const result = await service.listOpenForVendor(req.user);

    return res.ok(result.data, result.message);
  },
);

export const updateWorkOrderProgress = requestHandler<
  AuthRequest<{ id: string }>
>(async (req, res) => {
  const data = updateProgressSchema.parse(req.body);
  const result = await service.updateProgress(req.params.id, data, req.user);

  return res.ok(result.data, result.message);
});

export const approveWorkOrderCompletion = requestHandler<
  AuthRequest<{ id: string }>
>(async (req, res) => {
  const result = await service.approveCompletion(req.params.id, req.user);

  return res.ok(result.data, result.message);
});

export const rejectWorkOrderCompletion = requestHandler<
  AuthRequest<{ id: string }>
>(async (req, res) => {
  const data = rejectCompletionSchema.parse(req.body);
  const result = await service.rejectCompletion(
    req.params.id,
    data,
    req.user,
  );

  return res.ok(result.data, result.message);
});
export const requestWorkOrderInformation = requestHandler<AuthRequest<{ id: string }>>(async (req, res) => {
  const result = await service.requestInformation(req.params.id, requestInformationSchema.parse(req.body), req.user);
  return res.ok(result.data, result.message);
});
