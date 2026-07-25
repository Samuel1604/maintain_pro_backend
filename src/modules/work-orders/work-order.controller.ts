import { requestHandler } from "@/shared/utils/request.js";
import type { AuthRequest } from "@/shared/types/request.js";
import { WorkOrderService } from "./work-order.service.js";
import {
  createWorkOrderSchema,
  rejectCompletionSchema,
  updateProgressSchema,
} from "./work-order.schema.js";

const service = new WorkOrderService();

export const createWorkOrder = requestHandler<AuthRequest>(async (req, res) => {
  const data = createWorkOrderSchema.parse(req.body);
  const workOrder = await service.create(data, req.user);

  return res.status(201).json({
    success: true,
    data: workOrder,
  });
});

export const listOpenMarketplaceWorkOrders = requestHandler<AuthRequest>(
  async (req, res) => {
    const workOrders = await service.listOpenForVendor(req.user);

    return res.status(200).json({
      success: true,
      data: workOrders,
    });
  },
);

export const updateWorkOrderProgress = requestHandler<
  AuthRequest<{ id: string }>
>(async (req, res) => {
  const data = updateProgressSchema.parse(req.body);
  const workOrder = await service.updateProgress(req.params.id, data, req.user);

  return res.status(200).json({
    success: true,
    data: workOrder,
  });
});

export const approveWorkOrderCompletion = requestHandler<
  AuthRequest<{ id: string }>
>(async (req, res) => {
  const workOrder = await service.approveCompletion(req.params.id, req.user);

  return res.status(200).json({
    success: true,
    data: workOrder,
  });
});

export const rejectWorkOrderCompletion = requestHandler<
  AuthRequest<{ id: string }>
>(async (req, res) => {
  const data = rejectCompletionSchema.parse(req.body);
  const workOrder = await service.rejectCompletion(
    req.params.id,
    data,
    req.user,
  );

  return res.status(200).json({
    success: true,
    data: workOrder,
  });
});
