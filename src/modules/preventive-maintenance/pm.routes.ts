import { Router } from "express";
import { authMiddleware } from "@/shared/middleware/authenticate.js";
import { authorize } from "@/shared/middleware/authorize.js";
import { requireVerifiedEmail } from "@/shared/middleware/require-verified-email.js";
import { ROLES } from "@/shared/constants/roles.js";
import { requestHandler } from "@/shared/utils/request.js";
import type { AuthRequest } from "@/shared/types/request.js";
import { z } from "zod";
import { PMOccurrence } from "./pm-occurrence.model.js";
import { NotFoundException, BusinessException } from "@/shared/errors/index.js";
import { eventPublisher } from "@/container/index.js";
import { BusinessFactEvent } from "@/infrastructure/events/business-fact.event.js";
import { createPM, listPM, getPM, updatePM, archivePM, approvePM, rejectPM, listPMOccurrences, listPlanOccurrences, approvePMOccurrence, assignPM, clearPMAssignment, assignPMOccurrence, clearPMOccurrenceAssignment, getCalendar, skipPM } from "./pm.controller.js";
const router = Router(); router.use(authMiddleware);
router.post("/", authorize(ROLES.ADMIN, ROLES.FACILITY_MANAGER, ROLES.STAFF), requireVerifiedEmail, createPM);
router.get("/", authorize(ROLES.ADMIN, ROLES.FACILITY_MANAGER, ROLES.TECHNICIAN, ROLES.FINANCE, ROLES.STAFF), listPM);
router.get("/calendar", authorize(ROLES.ADMIN, ROLES.FACILITY_MANAGER, ROLES.TECHNICIAN, ROLES.FINANCE, ROLES.STAFF), getCalendar);
router.get("/occurrences", authorize(ROLES.ADMIN, ROLES.FACILITY_MANAGER, ROLES.TECHNICIAN, ROLES.FINANCE, ROLES.STAFF), listPMOccurrences);

router.post("/occurrences/:id/approve", authorize(ROLES.ADMIN, ROLES.FACILITY_MANAGER), requireVerifiedEmail, approvePMOccurrence);
router.post("/occurrences/:id/skip", authorize(ROLES.ADMIN, ROLES.FACILITY_MANAGER), requireVerifiedEmail, requestHandler<AuthRequest<{id:string}>>(async (req,res) => {
  const body = z.object({ reason: z.string().trim().min(3), nextDueAt: z.coerce.date().optional() }).parse(req.body);
  const occurrence = await PMOccurrence.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
  if (!occurrence) throw new NotFoundException("Occurrence not found");
  if (["completed", "cancelled"].includes(occurrence.status)) throw new BusinessException("Occurrence cannot be skipped");
  occurrence.status = "cancelled"; occurrence.rejectionReason = `Skipped: ${body.reason}`; await occurrence.save();
  if (body.nextDueAt) {
    const exists = await PMOccurrence.exists({ preventiveMaintenanceId: occurrence.preventiveMaintenanceId, scheduledAt: body.nextDueAt });
    if (!exists) await PMOccurrence.create({ organizationId: occurrence.organizationId, preventiveMaintenanceId: occurrence.preventiveMaintenanceId, facilityId: occurrence.facilityId, locationId: occurrence.locationId, assetId: occurrence.assetId, scheduledAt: body.nextDueAt, status: "scheduled", approvalState: "pending_approval", assignment: occurrence.assignment, assignmentHistory: [], createdBy: occurrence.createdBy });
  }
  await eventPublisher.publish(new BusinessFactEvent("PreventiveMaintenanceOccurrenceSkipped", { occurrenceId: occurrence._id.toString(), reason: body.reason, nextDueAt: body.nextDueAt?.toISOString() }, { organizationId: occurrence.organizationId.toString(), actorId: req.user.userId, aggregateType: "preventive_maintenance_occurrence", aggregateId: occurrence._id.toString() }));
  return res.ok(occurrence, "PM occurrence skipped");
}));
router.patch("/occurrences/:id/assignment", authorize(ROLES.ADMIN, ROLES.FACILITY_MANAGER), requireVerifiedEmail, assignPMOccurrence);
router.delete("/occurrences/:id/assignment", authorize(ROLES.ADMIN, ROLES.FACILITY_MANAGER), requireVerifiedEmail, clearPMOccurrenceAssignment);
router.get("/:id", authorize(ROLES.ADMIN, ROLES.FACILITY_MANAGER, ROLES.TECHNICIAN, ROLES.FINANCE, ROLES.STAFF), getPM);
router.get("/:id/occurrences", authorize(ROLES.ADMIN, ROLES.FACILITY_MANAGER, ROLES.TECHNICIAN, ROLES.FINANCE, ROLES.STAFF), listPlanOccurrences);
router.patch("/:id", authorize(ROLES.ADMIN, ROLES.FACILITY_MANAGER, ROLES.STAFF), requireVerifiedEmail, updatePM);
router.delete("/:id", authorize(ROLES.ADMIN, ROLES.FACILITY_MANAGER, ROLES.STAFF), requireVerifiedEmail, archivePM);
router.post("/:id/approve", authorize(ROLES.ADMIN, ROLES.FACILITY_MANAGER), requireVerifiedEmail, approvePM);
router.post("/:id/skip", authorize(ROLES.ADMIN, ROLES.FACILITY_MANAGER), requireVerifiedEmail, skipPM);
router.post("/:id/reject", authorize(ROLES.ADMIN, ROLES.FACILITY_MANAGER), requireVerifiedEmail, rejectPM);
router.patch("/:id/assignment", authorize(ROLES.ADMIN, ROLES.FACILITY_MANAGER), requireVerifiedEmail, assignPM);
router.delete("/:id/assignment", authorize(ROLES.ADMIN, ROLES.FACILITY_MANAGER), requireVerifiedEmail, clearPMAssignment);
export default router;
