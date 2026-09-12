import { requestHandler } from "@/shared/utils/request.js";
import type { AuthRequest } from "@/shared/types/request.js";
import {
  approveServiceRequestSchema,
  rejectServiceRequestSchema,
} from "./request.schema.js";
import { createServiceRequestSchema, serviceRequestListSchema, updateServiceRequestSchema } from "./request.schema.js";
import { ServiceRequestService } from "./request.service.js";

const service = new ServiceRequestService();

export const createServiceRequest = requestHandler<AuthRequest>(
  async (req, res) => {
    const data = createServiceRequestSchema.parse(req.body);
    const result = await service.create(data, req.user);

    return res.created(result.data, result.message);
  },
);

export const listServiceRequests = requestHandler<AuthRequest>(async (req, res) => res.ok(await service.list(req.user, serviceRequestListSchema.parse(req.query)), "Service requests retrieved"));

export const getServiceRequest = requestHandler<AuthRequest<{ id: string }>>(async (req, res) => res.ok(await service.getById(req.params.id, req.user), "Service request retrieved"));

export const updateServiceRequest = requestHandler<AuthRequest<{ id: string }>>(async (req, res) => res.ok(await service.update(req.params.id, updateServiceRequestSchema.parse(req.body), req.user), "Service request updated"));

export const approveServiceRequest = requestHandler<
  AuthRequest<{ id: string }>
>(async (req, res) => {
  const data = approveServiceRequestSchema.parse(req.body);
  const result = await service.approve(req.params.id, data, req.user);

  return res.ok(result.data, result.message);
});

export const rejectServiceRequest = requestHandler<AuthRequest<{ id: string }>>(
  async (req, res) => {
    const data = rejectServiceRequestSchema.parse(req.body);
    const result = await service.reject(req.params.id, data, req.user);

    return res.ok(result.data, result.message);
  },
);
