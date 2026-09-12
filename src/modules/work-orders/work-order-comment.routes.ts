import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "@/shared/middleware/authenticate.js";
import { authorize } from "@/shared/middleware/authorize.js";
import { requestHandler } from "@/shared/utils/request.js";
import type { AuthRequest } from "@/shared/types/request.js";
import { ROLES } from "@/shared/constants/roles.js";
import { WorkOrder } from "./work-order.model.js";
import { WorkOrderComment } from "./work-order-comment.model.js";
import { NotFoundException, AuthorizationException } from "@/shared/errors/index.js";
import { toObjectId } from "@/shared/validators/index.js";
import { AuditLog } from "@/modules/audit/audit.model.js";

const router = Router();
router.use(authMiddleware);
const schema = z.object({ content: z.string().trim().min(1).max(5000) });

router.get("/:id/comments", authorize(ROLES.ADMIN, ROLES.FACILITY_MANAGER, ROLES.TECHNICIAN, ROLES.FINANCE, ROLES.STAFF), requestHandler<AuthRequest<{ id: string }>>(async (req, res) => {
  if (!req.user.organizationId) throw new AuthorizationException("Organization context required");
  const workOrder = await WorkOrder.findOne({ _id: req.params.id, organizationId: req.user.organizationId }).select("_id");
  if (!workOrder) throw new NotFoundException("Work order not found");
  const data = await WorkOrderComment.find({ workOrderId: workOrder._id, organizationId: req.user.organizationId }).sort({ createdAt: 1 }).limit(100);
  return res.ok(data, "Work order comments retrieved");
}));
router.get("/:id/activity", authorize(ROLES.ADMIN, ROLES.FACILITY_MANAGER, ROLES.TECHNICIAN, ROLES.FINANCE, ROLES.STAFF), requestHandler<AuthRequest<{ id: string }>>(async (req, res) => {
  if (!req.user.organizationId) throw new AuthorizationException("Organization context required");
  const workOrder = await WorkOrder.findOne({ _id: req.params.id, organizationId: req.user.organizationId }).select("_id");
  if (!workOrder) throw new NotFoundException("Work order not found");
  const data = await AuditLog.find({ organizationId: req.user.organizationId, entityType: "work_order", entityId: req.params.id }).sort({ createdAt: -1 }).limit(100).lean();
  return res.ok(data, "Work order activity retrieved");
}));

router.post("/:id/comments", authorize(ROLES.ADMIN, ROLES.FACILITY_MANAGER, ROLES.TECHNICIAN, ROLES.VENDOR_TECHNICIAN), requestHandler<AuthRequest<{ id: string }>>(async (req, res) => {
  if (!req.user.organizationId) throw new AuthorizationException("Organization context required");
  const workOrder = await WorkOrder.findOne({ _id: req.params.id, organizationId: req.user.organizationId }).select("_id");
  if (!workOrder) throw new NotFoundException("Work order not found");
  const comment = await WorkOrderComment.create({ organizationId: toObjectId(req.user.organizationId), workOrderId: workOrder._id, authorId: toObjectId(req.user.userId), content: schema.parse(req.body).content });
  return res.created(comment, "Work order comment created");
}));

export default router;
