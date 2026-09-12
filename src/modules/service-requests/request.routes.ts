import { Router } from "express";
import mongoose from "mongoose";
import { authMiddleware } from "@/shared/middleware/authenticate.js";
import { authorize } from "@/shared/middleware/authorize.js";
import { requireVerifiedEmail } from "@/shared/middleware/require-verified-email.js";
import { ROLES } from "@/shared/constants/roles.js";
import { requestHandler } from "@/shared/utils/request.js";
import type { AuthRequest } from "@/shared/types/request.js";
import { z } from "zod";
import { BusinessFactEvent } from "@/infrastructure/events/business-fact.event.js";
import { OutboxEventRepository } from "@/infrastructure/events/outbox/outbox-event.repository.js";
import { serializeDomainEvent } from "@/infrastructure/events/bus/serialized-domain-event.js";
import { ServiceRequest } from "./request.model.js";
import { WorkOrder } from "@/modules/work-orders/work-order.model.js";
import { AuthorizationException, BusinessException, ConflictException, NotFoundException } from "@/shared/errors/index.js";
import { Upload } from "@/modules/uploads/upload.model.js";
import {
  approveServiceRequest,
  createServiceRequest,
  rejectServiceRequest,
  listServiceRequests,
  getServiceRequest,
  updateServiceRequest,
} from "./request.controller.js";

const router = Router();
const outbox = new OutboxEventRepository();

const saveRequestRating = async (request: import("./request.model.js").IServiceRequest, actorId: string, rating: number) => {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await request.save({ session });
      const event = new BusinessFactEvent("ServiceRequestRated", { serviceRequestId: request._id.toString(), rating }, {
        organizationId: request.organizationId.toString(),
        actorId,
        aggregateType: "service_request",
        aggregateId: request._id.toString(),
      });
      await outbox.append({
        eventId: event.eventId,
        eventType: event.name,
        aggregateId: event.aggregateId,
        aggregateType: event.aggregateType,
        payload: serializeDomainEvent(event) as unknown as Record<string, unknown>,
      }, session);
    });
  } finally {
    await session.endSession();
  }
};

router.use(authMiddleware);
router.get("/", authorize(ROLES.ADMIN, ROLES.FACILITY_MANAGER, ROLES.TECHNICIAN, ROLES.FINANCE, ROLES.STAFF), listServiceRequests);
router.get("/:id", authorize(ROLES.ADMIN, ROLES.FACILITY_MANAGER, ROLES.TECHNICIAN, ROLES.FINANCE, ROLES.STAFF), getServiceRequest);
router.patch("/:id", authorize(ROLES.ADMIN, ROLES.FACILITY_MANAGER, ROLES.TECHNICIAN, ROLES.STAFF), updateServiceRequest);

router.post(
  "/",
  authorize(
    ROLES.ADMIN,
    ROLES.FACILITY_MANAGER,
    ROLES.TECHNICIAN,
    ROLES.FINANCE,
    ROLES.STAFF,
  ),
  createServiceRequest,
);

router.post(
  "/:id/approve",
  authorize(ROLES.ADMIN, ROLES.FACILITY_MANAGER),
  approveServiceRequest,
);

router.post(
  "/:id/reject",
  authorize(ROLES.ADMIN, ROLES.FACILITY_MANAGER),
  rejectServiceRequest,
);
router.post("/:id/rate", authorize(ROLES.STAFF, ROLES.ADMIN, ROLES.FACILITY_MANAGER), requestHandler<AuthRequest<{id:string}>>(async (req,res) => {
  const body = z.object({ rating: z.number().int().min(1).max(5), feedback: z.string().max(2000).optional() }).parse(req.body);
  const request = await ServiceRequest.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
  if (!request) throw new NotFoundException("Service request not found");
  if (req.user.role === ROLES.STAFF && request.requestedBy.toString() !== req.user.userId) throw new AuthorizationException("Only the requesting staff member can rate this service request");
  if (request.rating !== undefined) throw new ConflictException("Service request is already rated");
  if (request.workOrderId) { const wo = await WorkOrder.findOne({ _id: request.workOrderId, organizationId: req.user.organizationId }); if (!wo || wo.status !== "completed") throw new BusinessException("Linked work order is not completed"); }
 request.rating = body.rating; request.feedback = body.feedback; request.ratedAt = new Date(); await saveRequestRating(request, req.user.userId, body.rating); return res.ok(request, "Service request rated");
}));
router.get("/:id/attachments", authorize(ROLES.ADMIN, ROLES.FACILITY_MANAGER, ROLES.TECHNICIAN, ROLES.FINANCE, ROLES.STAFF), requestHandler<AuthRequest<{id:string}>>(async (req,res) => { const request = await ServiceRequest.findOne({ _id: req.params.id, organizationId: req.user.organizationId }); if (!request) throw new NotFoundException("Service request not found"); return res.ok(await Upload.find({ _id: { $in: request.attachmentUploadIds ?? [] } }), "Attachments retrieved"); }));
router.post("/:id/attachments", authorize(ROLES.ADMIN, ROLES.FACILITY_MANAGER, ROLES.TECHNICIAN, ROLES.FINANCE, ROLES.STAFF), requireVerifiedEmail, requestHandler<AuthRequest<{id:string}>>(async (req,res) => { const body = z.object({ uploadId: z.string().regex(/^[a-f\d]{24}$/i) }).parse(req.body); const request = await ServiceRequest.findOne({ _id: req.params.id, organizationId: req.user.organizationId }); if (!request) throw new NotFoundException("Service request not found"); const upload = await Upload.findOne({ _id: body.uploadId, actorId: req.user.userId, organizationId: req.user.organizationId, purpose: "service-request-attachment", status: "available" }); if (!upload) throw new NotFoundException("Upload not found"); request.attachmentUploadIds = [...(request.attachmentUploadIds ?? []), upload._id]; await request.save(); return res.created(upload, "Attachment added"); }));

export default router;
