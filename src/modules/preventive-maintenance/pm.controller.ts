import { requestHandler } from "@/shared/utils/request.js";
import type { AuthRequest } from "@/shared/types/request.js";
import { createPMSchema, rejectPMSchema, listPMSchema, updatePMSchema, listOccurrenceSchema, assignmentSchema, calendarQuerySchema } from "./pm.schema.js";
import { PMService } from "./pm.service.js";
const service = new PMService();
export const createPM = requestHandler<AuthRequest>(async (req, res) => { const result = await service.create(createPMSchema.parse(req.body), req.user); return res.created(result.data, result.message); });
export const listPM = requestHandler<AuthRequest>(async (req, res) => { const result = await service.list(req.user, listPMSchema.parse(req.query)); return res.ok(result.data, result.message); });
export const getPM = requestHandler<AuthRequest<{ id: string }>>(async (req, res) => { const result = await service.get(req.params.id, req.user); return res.ok(result.data, result.message); });
export const updatePM = requestHandler<AuthRequest<{ id: string }>>(async (req, res) => { const result = await service.update(req.params.id, updatePMSchema.parse(req.body), req.user); return res.ok(result.data, result.message); });
export const archivePM = requestHandler<AuthRequest<{ id: string }>>(async (req, res) => { const result = await service.archive(req.params.id, req.user); return res.ok(result.data, result.message); });
export const approvePM = requestHandler<AuthRequest<{ id: string }>>(async (req, res) => { const result = await service.approve(req.params.id, req.user); return res.ok(result.data, result.message); });
export const rejectPM = requestHandler<AuthRequest<{ id: string }>>(async (req, res) => { const result = await service.reject(req.params.id, rejectPMSchema.parse(req.body), req.user); return res.ok(result.data, result.message); });
export const listPMOccurrences = requestHandler<AuthRequest>(async (req, res) => { const result = await service.listOccurrences(req.user, listOccurrenceSchema.parse(req.query)); return res.ok(result.data, result.message); });
export const getCalendar = requestHandler<AuthRequest>(async (req, res) => { const result = await service.getCalendar(req.user, calendarQuerySchema.parse(req.query)); return res.ok(result.data, result.message); });
export const listPlanOccurrences = requestHandler<AuthRequest<{ id: string }>>(async (req, res) => { const result = await service.listPlanOccurrences(req.params.id, req.user, listOccurrenceSchema.parse(req.query)); return res.ok(result.data, result.message); });

export const approvePMOccurrence = requestHandler<AuthRequest<{ id: string }>>(async (req, res) => { const result = await service.approveOccurrence(req.params.id, req.user); return res.ok(result.data, result.message); });
export const assignPM = requestHandler<AuthRequest<{ id: string }>>(async (req, res) => { const result = await service.assignPlan(req.params.id, assignmentSchema.parse(req.body), req.user); return res.ok(result.data, result.message); });
export const clearPMAssignment = requestHandler<AuthRequest<{ id: string }>>(async (req, res) => { const result = await service.clearPlanAssignment(req.params.id, req.user); return res.ok(result.data, result.message); });
export const assignPMOccurrence = requestHandler<AuthRequest<{ id: string }>>(async (req, res) => { const result = await service.assignOccurrence(req.params.id, assignmentSchema.parse(req.body), req.user); return res.ok(result.data, result.message); });
export const clearPMOccurrenceAssignment = requestHandler<AuthRequest<{ id: string }>>(async (req, res) => { const result = await service.clearOccurrenceAssignment(req.params.id, req.user); return res.ok(result.data, result.message); });
export const skipPM = requestHandler<AuthRequest<{ id: string }>>(async (req, res) => {
  const { z } = await import("zod");
  const { reason } = z.object({ reason: z.string().trim().min(3) }).parse(req.body);
  const result = await service.skip(req.params.id, reason, req.user);
  return res.ok(result.data, result.message);
});
