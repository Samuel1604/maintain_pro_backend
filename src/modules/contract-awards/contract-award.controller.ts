import { requestHandler } from "@/shared/utils/request.js";
import type { AuthRequest } from "@/shared/types/request.js";
import { ContractAwardService } from "./contract-award.service.js";
import { createContractAwardSchema, awardWorkOrderSchema, renewContractAwardSchema } from "./contract-award.schema.js";

const service = new ContractAwardService();
export const renewContractAward = requestHandler<AuthRequest<{ id: string }>>(async (req, res) => res.ok((await service.renew(req.params.id, renewContractAwardSchema.parse(req.body), req.user)).data, "Contract award renewed"));

export const createContractAward = requestHandler<AuthRequest>(
  async (req, res) => {
    const data = createContractAwardSchema.parse(req.body);
    const result = await service.create(data, req.user);

    return res.created(result.data, result.message);
  },
);

export const listContractAwards = requestHandler<AuthRequest>(async (req, res) => {
  const result = await service.list(req.user);
  return res.ok(result.data, result.message);
});
export const listVendorContractAwards = requestHandler<AuthRequest>(async (req, res) => {
  const result = await service.listForVendor(req.user);
  return res.ok(result.data, result.message);
});

export const updateContractAwardStatus = requestHandler<AuthRequest<{ id: string }>>(async (req, res) => {
  const result = await service.updateStatus(req.params.id, req.body.status, req.user);
  return res.ok(result.data, result.message);
});
export const addAwardWorkOrder = requestHandler<AuthRequest<{ id: string }>>(async (req, res) => res.created(await service.addWorkOrder(req.params.id, awardWorkOrderSchema.parse(req.body).workOrderId, req.user), "Work Order associated with award"));
export const listAwardWorkOrders = requestHandler<AuthRequest<{ id: string }>>(async (req, res) => res.ok(await service.listWorkOrders(req.params.id, req.user), "Award Work Orders retrieved successfully"));
export const removeAwardWorkOrder = requestHandler<AuthRequest<{ id: string; workOrderId: string }>>(async (req, res) => res.ok(await service.removeWorkOrder(req.params.id, req.params.workOrderId, req.user), "Work Order removed from award"));
