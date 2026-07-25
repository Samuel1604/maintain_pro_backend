import { requestHandler } from "@/shared/utils/request.js";
import type { AuthRequest } from "@/shared/types/request.js";
import {
  approveServiceRequestSchema,
  rejectServiceRequestSchema,
} from "./request.schema.js";
import { createServiceRequestSchema } from "./request.schema.js";
import { ServiceRequestService } from "./request.service.js";

const service = new ServiceRequestService();

export const createServiceRequest = requestHandler<AuthRequest>(
  async (req, res) => {
    const data = createServiceRequestSchema.parse(req.body);
    const serviceRequest = await service.create(data, req.user);

    return res.status(201).json({
      success: true,
      data: serviceRequest,
    });
  },
);

export const approveServiceRequest = requestHandler<
  AuthRequest<{ id: string }>
>(async (req, res) => {
  const data = approveServiceRequestSchema.parse(req.body);
  const result = await service.approve(req.params.id, data, req.user);

  return res.status(200).json({
    success: true,
    data: result,
  });
});

export const rejectServiceRequest = requestHandler<AuthRequest<{ id: string }>>(
  async (req, res) => {
    const data = rejectServiceRequestSchema.parse(req.body);
    const serviceRequest = await service.reject(req.params.id, data, req.user);

    return res.status(200).json({
      success: true,
      data: serviceRequest,
    });
  },
);
