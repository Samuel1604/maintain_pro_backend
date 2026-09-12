import { Router } from "express";
import { authMiddleware } from "@/shared/middleware/authenticate.js";
import { authorize } from "@/shared/middleware/authorize.js";
import { requireVerifiedEmail } from "@/shared/middleware/require-verified-email.js";
import { ROLES } from "@/shared/constants/roles.js";
import {
  approveWorkOrderCompletion,
  createWorkOrder,
  listOpenMarketplaceWorkOrders,
  rejectWorkOrderCompletion,
  updateWorkOrderProgress,
  listWorkOrders, listVendorWorkOrders, getWorkOrder, updateWorkOrder, archiveWorkOrder, assignWorkOrder, listVendorCandidates, transitionWorkOrder, listTechnicianCandidates,
  listFinanceApprovals,
  requestWorkOrderInformation,
} from "./work-order.controller.js";
import { WorkOrder, type IWorkOrder } from "./work-order.model.js";
import { Invoice } from "@/modules/invoices/invoice.model.js";
import { AuthorizationException, BusinessException, ConflictException, NotFoundException } from "@/shared/errors/index.js";
import { vendorAcceptSchema, vendorRejectSchema, completionInvoiceSchema } from "./work-order.schema.js";
import { requestHandler } from "@/shared/utils/request.js";
import type { AuthRequest } from "@/shared/types/request.js";
import { WorkOrderAttachment, WorkOrderTimeLog, WorkOrderPart } from "./work-order-support.model.js";
import { Upload } from "@/modules/uploads/upload.model.js";
import { z } from "zod";
import mongoose from "mongoose";
import { WorkOrderService } from "./work-order.service.js";
import { OutboxEventRepository } from "@/infrastructure/events/outbox/outbox-event.repository.js";
import { serializeDomainEvent } from "@/infrastructure/events/bus/serialized-domain-event.js";
import { BusinessFactEvent } from "@/infrastructure/events/business-fact.event.js";
const supportService = new WorkOrderService();
const outbox = new OutboxEventRepository();

const saveWorkOrderFact = async (name: string, workOrder: IWorkOrder, actorId: string, payload: Record<string, unknown> = {}) => {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await workOrder.save({ session });
      const event = new BusinessFactEvent(name, { workOrderId: workOrder._id.toString(), ...payload }, {
        organizationId: workOrder.organizationId.toString(),
        vendorId: workOrder.assignedVendorId?.toString(),
        actorId,
        aggregateType: "work_order",
        aggregateId: workOrder._id.toString(),
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

const createAttachmentWithFact = async (workOrder: IWorkOrder, uploadId: mongoose.Types.ObjectId, actorId: string) => {
  const session = await mongoose.startSession();
  try {
    let attachment!: InstanceType<typeof WorkOrderAttachment>;
    await session.withTransaction(async () => {
      const [created] = await WorkOrderAttachment.create([{ workOrderId: workOrder._id, uploadId, uploadedBy: actorId }], { session });
      if (!created) throw new Error("Work-order attachment was not created");
      attachment = created;
      const event = new BusinessFactEvent("WorkOrderAttachmentAdded", { workOrderId: workOrder._id.toString(), attachmentId: attachment._id.toString(), uploadId: String(uploadId) }, {
        organizationId: workOrder.organizationId.toString(),
        actorId,
        aggregateType: "work_order",
        aggregateId: workOrder._id.toString(),
      });
      await outbox.append({
        eventId: event.eventId,
        eventType: event.name,
        aggregateId: event.aggregateId,
        aggregateType: event.aggregateType,
        payload: serializeDomainEvent(event) as unknown as Record<string, unknown>,
      }, session);
    });
    return attachment;
  } finally {
    await session.endSession();
  }
};

const assertAssignedWorker = (workOrder: IWorkOrder, user: AuthRequest["user"]) => {
  const isManager = user.role === ROLES.ADMIN || user.role === ROLES.FACILITY_MANAGER;
  const isAssignedOrgTechnician = user.role === ROLES.TECHNICIAN && workOrder.assignedTechnicianId?.toString() === user.userId;
  const isAssignedVendorTechnician = user.role === ROLES.VENDOR_TECHNICIAN && workOrder.assignedVendorTechnicianId?.toString() === user.userId;
  if (!isManager && !isAssignedOrgTechnician && !isAssignedVendorTechnician) {
    throw new AuthorizationException("Only the assigned worker or an organization manager may modify this work order");
  }
};

const router = Router();

router.use(authMiddleware);
router.get("/vendor/assigned", authorize(ROLES.VENDOR_LEAD, ROLES.VENDOR_MANAGER, ROLES.VENDOR_TECHNICIAN), listVendorWorkOrders);
router.get("/finance/pending-approval", authorize(ROLES.ADMIN, ROLES.FACILITY_MANAGER, ROLES.FINANCE), listFinanceApprovals);
router.get("/marketplace/open", authorize(ROLES.VENDOR_LEAD, ROLES.VENDOR_MANAGER), listOpenMarketplaceWorkOrders);
router.get("/", authorize(ROLES.ADMIN, ROLES.FACILITY_MANAGER, ROLES.TECHNICIAN, ROLES.FINANCE), listWorkOrders);
router.get("/:id", authorize(ROLES.ADMIN, ROLES.FACILITY_MANAGER, ROLES.TECHNICIAN, ROLES.FINANCE, ROLES.VENDOR_LEAD, ROLES.VENDOR_MANAGER, ROLES.VENDOR_TECHNICIAN), getWorkOrder);
router.patch("/:id", authorize(ROLES.ADMIN, ROLES.FACILITY_MANAGER), updateWorkOrder);
router.delete("/:id", authorize(ROLES.ADMIN, ROLES.FACILITY_MANAGER), archiveWorkOrder);
router.post("/:id/assign", authorize(ROLES.ADMIN, ROLES.FACILITY_MANAGER), assignWorkOrder);
router.get("/:id/vendor-candidates", authorize(ROLES.ADMIN, ROLES.FACILITY_MANAGER), listVendorCandidates);
router.post("/:id/transition", authorize(ROLES.TECHNICIAN, ROLES.VENDOR_TECHNICIAN, ROLES.VENDOR_LEAD, ROLES.VENDOR_MANAGER), transitionWorkOrder);
router.get("/:id/technician-candidates", authorize(ROLES.ADMIN, ROLES.FACILITY_MANAGER), listTechnicianCandidates);

router.post("/:id/vendor/accept", authorize(ROLES.VENDOR_LEAD, ROLES.VENDOR_MANAGER), requireVerifiedEmail, requestHandler<AuthRequest<{id:string}>>(async (req,res) => {
  if (!req.user.vendorId) throw new AuthorizationException("Vendor context required");
  const body = vendorAcceptSchema.parse(req.body);
  const workOrder = await WorkOrder.findOne({ _id: req.params.id, assignedVendorId: req.user.vendorId });
  if (!workOrder) throw new NotFoundException("Work order not found");
  if (!["assigned", "open"].includes(workOrder.status)) throw new BusinessException("Work order is not available for acceptance");
  workOrder.vendorOfferStatus = "accepted"; if (body.proposedSchedule) workOrder.proposedSchedule = body.proposedSchedule;
  await saveWorkOrderFact("VendorAssignmentAccepted", workOrder, req.user.userId, { proposedSchedule: body.proposedSchedule?.toISOString() }); return res.ok(workOrder, "Vendor assignment accepted");
}));
router.post("/:id/vendor/reject", authorize(ROLES.VENDOR_LEAD, ROLES.VENDOR_MANAGER), requireVerifiedEmail, requestHandler<AuthRequest<{id:string}>>(async (req,res) => {
  if (!req.user.vendorId) throw new AuthorizationException("Vendor context required");
  const body = vendorRejectSchema.parse(req.body);
  const workOrder = await WorkOrder.findOne({ _id: req.params.id, assignedVendorId: req.user.vendorId });
  if (!workOrder) throw new NotFoundException("Work order not found");
  if (!["assigned", "open"].includes(workOrder.status)) throw new BusinessException("Work order is not available for rejection");
  workOrder.vendorOfferStatus = "rejected"; workOrder.vendorRejectReason = body.reason; workOrder.assignedVendorId = undefined; workOrder.assignedVendorTechnicianId = undefined; workOrder.assignedTechnicianId = undefined; workOrder.status = "open";
  await saveWorkOrderFact("VendorAssignmentRejected", workOrder, req.user.userId, { reason: body.reason }); return res.ok(workOrder, "Vendor assignment rejected");
}));
router.post("/:id/invoice", authorize(ROLES.VENDOR_LEAD, ROLES.VENDOR_MANAGER), requireVerifiedEmail, requestHandler<AuthRequest<{id:string}>>(async (req,res) => {
  if (!req.user.vendorId) throw new AuthorizationException("Vendor context required");
  const body = completionInvoiceSchema.parse(req.body);
  const workOrder = await WorkOrder.findOne({ _id: req.params.id, assignedVendorId: req.user.vendorId });
  if (!workOrder) throw new NotFoundException("Work order not found");
  if (!["pending_completion", "completed"].includes(workOrder.status)) throw new BusinessException("Work order is not ready for invoicing");
  if (await Invoice.exists({ workOrderId: workOrder._id })) throw new ConflictException("An invoice already exists for this work order");
  const session = await mongoose.startSession();
  let invoice!: InstanceType<typeof Invoice>;
  try {
    await session.withTransaction(async () => {
      const [created] = await Invoice.create([{ ...body, organizationId: workOrder.organizationId, vendorId: req.user.vendorId, workOrderId: workOrder._id, currency: body.currency ?? "NGN", status: "submitted" }], { session });
      if (!created) throw new Error("Invoice was not created");
      invoice = created;
      const event = new BusinessFactEvent("InvoiceSubmitted", { workOrderId: workOrder._id.toString(), invoiceId: invoice._id.toString(), amount: invoice.amount }, {
        organizationId: workOrder.organizationId.toString(),
        vendorId: req.user.vendorId,
        actorId: req.user.userId,
        aggregateType: "invoice",
        aggregateId: invoice._id.toString(),
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
  return res.created(invoice, "Invoice submitted");
}));

const supportRoles = [ROLES.ADMIN, ROLES.FACILITY_MANAGER, ROLES.TECHNICIAN, ROLES.FINANCE, ROLES.VENDOR_LEAD, ROLES.VENDOR_MANAGER, ROLES.VENDOR_TECHNICIAN] as const;
router.get("/:id/attachments", authorize(...supportRoles), requestHandler<AuthRequest<{id:string}>>(async (req,res) => { const wo = await supportService.get(req.params.id, req.user); return res.ok(await WorkOrderAttachment.find({ workOrderId: wo._id }).populate("uploadId").sort({ createdAt: -1 }).limit(100), "Attachments retrieved"); }));
router.post("/:id/attachments", authorize(ROLES.ADMIN, ROLES.FACILITY_MANAGER, ROLES.TECHNICIAN, ROLES.VENDOR_TECHNICIAN), requestHandler<AuthRequest<{id:string}>>(async (req,res) => { const wo = await supportService.get(req.params.id, req.user); assertAssignedWorker(wo, req.user); const body = z.object({ uploadId: z.string().regex(/^[a-f\d]{24}$/i) }).parse(req.body); const upload = await Upload.findOne({ _id: body.uploadId, actorId: req.user.userId, purpose: "work-order-attachment", status: "available", ...(req.user.organizationId ? { organizationId: req.user.organizationId } : {}) }); if (!upload) throw new NotFoundException("Upload not found"); const attachment = await createAttachmentWithFact(wo, upload._id, req.user.userId); return res.created(attachment, "Attachment added"); }));
router.delete("/:id/attachments/:attachmentId", authorize(ROLES.ADMIN, ROLES.FACILITY_MANAGER, ROLES.TECHNICIAN, ROLES.VENDOR_TECHNICIAN), requestHandler<AuthRequest<{id:string; attachmentId:string}>>(async (req,res) => { const wo = await supportService.get(req.params.id, req.user); assertAssignedWorker(wo, req.user); const attachment = await WorkOrderAttachment.findOneAndDelete({ _id: req.params.attachmentId, workOrderId: wo._id }); if (!attachment) throw new NotFoundException("Attachment not found"); return res.ok({ id: attachment._id }, "Attachment deleted"); }));
router.get("/:id/time-logs", authorize(...supportRoles), requestHandler<AuthRequest<{id:string}>>(async (req,res) => { const wo = await supportService.get(req.params.id, req.user); return res.ok(await WorkOrderTimeLog.find({ workOrderId: wo._id }).sort({ createdAt: -1 }).limit(100), "Time logs retrieved"); }));
router.post("/:id/time-logs", authorize(ROLES.TECHNICIAN, ROLES.VENDOR_TECHNICIAN), requestHandler<AuthRequest<{id:string}>>(async (req,res) => { const wo = await supportService.get(req.params.id, req.user); assertAssignedWorker(wo, req.user); const body = z.object({ hours: z.number().positive(), note: z.string().optional(), startedAt: z.coerce.date().optional(), endedAt: z.coerce.date().optional() }).parse(req.body); return res.created(await WorkOrderTimeLog.create({ ...body, workOrderId: wo._id, userId: req.user.userId }), "Time log added"); }));
router.get("/:id/parts", authorize(...supportRoles), requestHandler<AuthRequest<{id:string}>>(async (req,res) => { const wo = await supportService.get(req.params.id, req.user); return res.ok(await WorkOrderPart.find({ workOrderId: wo._id }).sort({ createdAt: -1 }).limit(100), "Parts retrieved"); }));
router.post("/:id/parts", authorize(ROLES.TECHNICIAN, ROLES.VENDOR_TECHNICIAN), requestHandler<AuthRequest<{id:string}>>(async (req,res) => { const wo = await supportService.get(req.params.id, req.user); assertAssignedWorker(wo, req.user); const body = z.object({ name: z.string().trim().min(1), sku: z.string().optional(), quantity: z.number().int().positive(), inventoryItemId: z.string().regex(/^[a-f\d]{24}$/i).optional() }).parse(req.body); return res.created(await WorkOrderPart.create({ ...body, workOrderId: wo._id }), "Part added"); }));

router.post(
  "/",
  authorize(ROLES.ADMIN, ROLES.FACILITY_MANAGER),
  requireVerifiedEmail,
  createWorkOrder,
);

router.patch(
  "/:id/progress",
  authorize(ROLES.TECHNICIAN, ROLES.VENDOR_TECHNICIAN),
  updateWorkOrderProgress,
);

router.post(
  "/:id/completion/approve",
  authorize(ROLES.ADMIN, ROLES.FACILITY_MANAGER, ROLES.FINANCE),
  approveWorkOrderCompletion,
);

router.post(
  "/:id/completion/reject",
  authorize(ROLES.ADMIN, ROLES.FACILITY_MANAGER, ROLES.FINANCE),
  rejectWorkOrderCompletion,
);
router.post(
  "/:id/completion/request-information",
  authorize(ROLES.ADMIN, ROLES.FACILITY_MANAGER, ROLES.FINANCE),
  requestWorkOrderInformation,
);

export default router;
