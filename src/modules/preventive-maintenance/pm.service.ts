import { Types } from "mongoose";
import { AuthorizationException, BusinessException, NotFoundException } from "@/shared/errors/index.js";
import { ROLES } from "@/shared/constants/roles.js";
import { FacilityRepository } from "@/modules/facilities/facility.repository.js";
import { LocationRepository } from "@/modules/locations/location.repository.js";
import { AssetRepository } from "@/modules/assets/asset.repository.js";
import { WorkOrderService } from "@/modules/work-orders/work-order.service.js";
import { assetHistoryService } from "@/modules/asset-history/asset-history.service.js";
import { ASSET_HISTORY_EVENTS } from "@/modules/asset-history/asset-history.types.js";
import { WorkOrderRepository } from "@/modules/work-orders/work-order.repository.js";
import { User } from "@/modules/users/user.model.js";
import { PMRepository } from "./pm.repository.js";
import { PMOccurrenceRepository } from "./pm-occurrence.repository.js";
import type { IPMPlan } from "./pm.model.js";
import type { IPMOccurrence } from "./pm-occurrence.model.js";
import type { CreatePMInput, RejectPMInput, UpdatePMInput, ListPMInput, ListOccurrenceInput, AssignmentInput } from "./pm.schema.js";
import { toPMResponse } from "./pm.mapper.js";
import { toPMOccurrenceResponse } from "./pm-occurrence.mapper.js";
import { generateOccurrenceDates } from "./pm.recurrence.js";
import { eventPublisher } from "@/container/index.js";
import {
  PreventiveMaintenanceOccurrenceApprovedEvent,
  PreventiveMaintenanceOccurrenceAssignmentChangedEvent,
  PreventiveMaintenanceOccurrenceCancelledEvent,
  PreventiveMaintenanceOccurrenceCreatedEvent,
  PreventiveMaintenanceOccurrenceLinkedToWorkOrderEvent,
  PreventiveMaintenanceOccurrenceRejectedEvent,
  PreventiveMaintenancePlanCancelledEvent,
  PreventiveMaintenancePlanCreatedEvent,
  PreventiveMaintenancePlanUpdatedEvent,
  PreventiveMaintenanceSkippedEvent,
} from "./events/pm.events.js";

type Actor = { userId: string; role: string; organizationId?: string };
const HORIZON_DAYS = 90;

export class PMService {
  private repository = new PMRepository();
  private occurrences = new PMOccurrenceRepository();
  private facilities = new FacilityRepository();
  private locations = new LocationRepository();
  private assets = new AssetRepository();
  private workOrders = new WorkOrderService();

  private requireOrganization(actor: Actor): string { if (!actor.organizationId) throw new AuthorizationException("Organization context required"); return actor.organizationId; }
  private isManager(actor: Actor) { return actor.role === ROLES.ADMIN || actor.role === ROLES.FACILITY_MANAGER; }

  private async validateHierarchy(input: CreatePMInput, organizationId: string) {
    const facility = await this.facilities.findById(input.facilityId);
    const location = await this.locations.findById(input.locationId);
    const asset = await this.assets.findByIdInOrganization(input.assetId, organizationId);
    if (!facility || facility.organizationId.toString() !== organizationId || !location || location.facilityId.toString() !== input.facilityId || location.organizationId.toString() !== organizationId || !asset || asset.locationId.toString() !== input.locationId) throw new AuthorizationException("Invalid maintenance asset hierarchy");
  }

  async create(input: CreatePMInput, actor: Actor) {
    const organizationId = this.requireOrganization(actor);
    if (input.organizationId !== organizationId) throw new AuthorizationException("Organization access denied");
    await this.validateHierarchy(input, organizationId);
    const firstDate = input.recurrence?.startDate ?? input.occurrenceDate ?? input.plannedDate;
    const manager = this.isManager(actor);
    const defaultAssignment = input.defaultAssignment ? await this.resolveAssignment(input.defaultAssignment, organizationId, actor) : undefined;
    const pm = await this.repository.create({ ...input, defaultAssignment, assignmentHistory: defaultAssignment ? [{ action: "assigned", targetType: defaultAssignment.targetType, targetId: defaultAssignment.targetId, actorId: new Types.ObjectId(actor.userId), occurredAt: new Date() }] : [], recurrence: input.recurrence, isActive: true, occurrenceDate: firstDate, organizationId: new Types.ObjectId(organizationId), facilityId: new Types.ObjectId(input.facilityId), locationId: new Types.ObjectId(input.locationId), assetId: new Types.ObjectId(input.assetId), createdBy: new Types.ObjectId(actor.userId), status: manager ? "approved" : "pending_approval", occurrenceStatus: "scheduled" });
    const dates = input.recurrence ? generateOccurrenceDates(input.recurrence, new Date(Date.now() + HORIZON_DAYS * 86_400_000)) : [firstDate];
    for (const scheduledAt of dates) await this.createOccurrence(pm, scheduledAt, actor, manager);
    await assetHistoryService.append({ organizationId, assetId: input.assetId, event: ASSET_HISTORY_EVENTS.OTHER, description: "Preventive maintenance scheduled", actorId: actor.userId, sourceType: "preventive_maintenance", sourceId: pm._id.toString() });
    await eventPublisher.publish(new PreventiveMaintenancePlanCreatedEvent(this.planPayload(pm), { organizationId, actorId: actor.userId, aggregateType: "preventive_maintenance_plan", aggregateId: pm._id.toString() }));
    return { success: true, message: manager ? "Preventive maintenance approved and work order created" : "Preventive maintenance submitted for approval", data: toPMResponse(pm) };
  }

  private async createOccurrence(pm: IPMPlan, scheduledAt: Date, actor: Actor, approved: boolean) {
    const existing = await this.occurrences.findBySchedule(pm._id.toString(), scheduledAt);
    if (existing) return existing;
    const assignment = pm.defaultAssignment ? { ...pm.defaultAssignment, assignedAt: new Date(pm.defaultAssignment.assignedAt), assignedBy: pm.defaultAssignment.assignedBy } : undefined;
    const occurrence = await this.occurrences.create({ organizationId: pm.organizationId, preventiveMaintenanceId: pm._id, facilityId: pm.facilityId, locationId: pm.locationId, assetId: pm.assetId, scheduledAt, assignment, assignmentHistory: assignment ? [{ action: "assigned", targetType: assignment.targetType, targetId: assignment.targetId, actorId: assignment.assignedBy, occurredAt: assignment.assignedAt }] : [], status: "scheduled", approvalState: approved ? "approved" : "pending_approval", createdBy: pm.createdBy });
    if (approved) { const workOrder = await this.generateWorkOrder(pm, actor, occurrence); occurrence.approvalState = "approved"; occurrence.approvedBy = new Types.ObjectId(actor.userId); occurrence.approvedAt = new Date(); occurrence.workOrderId = workOrder._id; occurrence.status = "generated"; await occurrence.save(); await eventPublisher.publish(new PreventiveMaintenanceOccurrenceCreatedEvent(this.occurrencePayload(occurrence), { organizationId: pm.organizationId.toString(), actorId: actor.userId, aggregateType: "preventive_maintenance_occurrence", aggregateId: occurrence._id.toString() })); await this.publishOccurrenceApproved(pm, occurrence, actor.userId, workOrder._id.toString()); } else { await eventPublisher.publish(new PreventiveMaintenanceOccurrenceCreatedEvent(this.occurrencePayload(occurrence), { organizationId: pm.organizationId.toString(), actorId: actor.userId, aggregateType: "preventive_maintenance_occurrence", aggregateId: occurrence._id.toString() })); }
    return occurrence;
  }

  async approve(id: string, actor: Actor) { const pm = await this.requirePendingPlan(id, actor); const occurrence = await this.firstPendingOccurrence(pm); if (!occurrence) throw new BusinessException("No pending occurrence is available for approval"); await this.approveOccurrenceRecord(pm, occurrence, actor); return { success: true, message: "Preventive maintenance approved and work order created", data: toPMResponse(pm) }; }
  async approveOccurrence(id: string, actor: Actor) { if (!this.isManager(actor)) throw new AuthorizationException("Only admin or facility manager can approve maintenance"); const organizationId = this.requireOrganization(actor); const occurrence = await this.occurrences.findById(id); if (!occurrence || occurrence.organizationId.toString() !== organizationId) throw new NotFoundException("Preventive maintenance occurrence not found"); if (occurrence.approvalState !== "pending_approval") throw new BusinessException("Only pending occurrences can be approved"); const pm = await this.repository.findById(occurrence.preventiveMaintenanceId.toString()); if (!pm) throw new NotFoundException("Preventive maintenance not found"); await this.approveOccurrenceRecord(pm, occurrence, actor); return { success: true, message: "Preventive maintenance occurrence approved", data: toPMOccurrenceResponse(occurrence) }; }
  private async approveOccurrenceRecord(pm: IPMPlan, occurrence: IPMOccurrence, actor: Actor) { const workOrder = await this.generateWorkOrder(pm, actor, occurrence); occurrence.approvalState = "approved"; occurrence.approvedBy = new Types.ObjectId(actor.userId); occurrence.approvedAt = new Date(); occurrence.workOrderId = workOrder._id; occurrence.status = "generated"; await occurrence.save(); await this.publishOccurrenceApproved(pm, occurrence, actor.userId, workOrder._id.toString()); }
  private async firstPendingOccurrence(pm: IPMPlan) { const records = await this.occurrences.findByPlan(pm.organizationId.toString(), pm._id.toString(), { limit: 1 }); return records.find((item) => item.approvalState === "pending_approval"); }
  private async requirePendingPlan(id: string, actor: Actor) { if (!this.isManager(actor)) throw new AuthorizationException("Only admin or facility manager can approve maintenance"); const organizationId = this.requireOrganization(actor); const pm = await this.repository.findById(id); if (!pm || pm.organizationId.toString() !== organizationId) throw new NotFoundException("Preventive maintenance not found"); if (pm.status !== "pending_approval") throw new BusinessException("Only pending maintenance can be approved"); return pm; }

  async reject(id: string, input: RejectPMInput, actor: Actor) { if (!this.isManager(actor)) throw new AuthorizationException("Only admin or facility manager can reject maintenance"); const organizationId = this.requireOrganization(actor); const pm = await this.repository.findById(id); if (!pm || pm.organizationId.toString() !== organizationId) throw new NotFoundException("Preventive maintenance not found"); if (pm.status !== "pending_approval") throw new BusinessException("Only pending maintenance can be rejected"); const occurrence = await this.firstPendingOccurrence(pm); if (occurrence) { occurrence.approvalState = "rejected"; occurrence.rejectedBy = new Types.ObjectId(actor.userId); occurrence.rejectedAt = new Date(); occurrence.rejectionReason = input.rejectionReason; await occurrence.save(); await eventPublisher.publish(new PreventiveMaintenanceOccurrenceRejectedEvent(this.occurrencePayload(occurrence), { organizationId, actorId: actor.userId, aggregateType: "preventive_maintenance_occurrence", aggregateId: occurrence._id.toString() })); } pm.status = "rejected"; pm.rejectedBy = new Types.ObjectId(actor.userId); pm.rejectedAt = new Date(); pm.rejectionReason = input.rejectionReason; await pm.save(); await eventPublisher.publish(new PreventiveMaintenancePlanUpdatedEvent(this.planPayload(pm), { organizationId, actorId: actor.userId, aggregateType: "preventive_maintenance_plan", aggregateId: pm._id.toString() })); return { success: true, message: "Preventive maintenance rejected", data: toPMResponse(pm) }; }
  async get(id: string, actor: Actor) { const organizationId = this.requireOrganization(actor); const record = await this.repository.findById(id); if (!record || record.organizationId.toString() !== organizationId) throw new NotFoundException("Preventive maintenance not found"); return { success: true, message: "Preventive maintenance retrieved successfully", data: toPMResponse(record) }; }
  async list(actor: Actor, options: ListPMInput) { const organizationId = this.requireOrganization(actor); const filter: Record<string, unknown> = {}; if (options.status) filter.status = options.status; if (options.occurrenceStatus) filter.occurrenceStatus = options.occurrenceStatus; if (options.assetId) filter.assetId = options.assetId; if (options.facilityId) filter.facilityId = options.facilityId; if (options.locationId) filter.locationId = options.locationId; if (options.search) filter.$or = [{ title: { $regex: options.search, $options: "i" } }, { maintenanceType: { $regex: options.search, $options: "i" } }]; if (options.from || options.to) filter.occurrenceDate = { ...(options.from ? { $gte: options.from } : {}), ...(options.to ? { $lte: options.to } : {}) }; const sort: Record<string, 1 | -1> = options.sort === "occurrenceDate" ? { occurrenceDate: 1 } : options.sort === "createdAt" ? { createdAt: 1 } : options.sort === "-createdAt" ? { createdAt: -1 } : { occurrenceDate: -1 }; const [records, total] = await Promise.all([this.repository.findByOrganization(organizationId, { filter, sort, skip: (options.page - 1) * options.limit, limit: options.limit }), this.repository.count(organizationId, filter)]); return { success: true, message: "Preventive maintenance retrieved successfully", data: { data: records.map(toPMResponse), pagination: { page: options.page, limit: options.limit, total, pages: Math.ceil(total / options.limit) } } }; }
  async listOccurrences(actor: Actor, options: ListOccurrenceInput) { const organizationId = this.requireOrganization(actor); const filter: Record<string, unknown> = {}; for (const key of ["status", "approvalState", "preventiveMaintenanceId", "assetId", "facilityId", "locationId"] as const) if (options[key]) filter[key] = options[key]; if (options.from || options.to) filter.scheduledAt = { ...(options.from ? { $gte: options.from } : {}), ...(options.to ? { $lte: options.to } : {}) }; const [records, total] = await Promise.all([this.occurrences.findByOrganization(organizationId, { filter, skip: (options.page - 1) * options.limit, limit: options.limit }), this.occurrences.count(organizationId, filter)]); return { success: true, message: "Preventive maintenance occurrences retrieved successfully", data: { data: records.map(toPMOccurrenceResponse), pagination: { page: options.page, limit: options.limit, total, pages: Math.ceil(total / options.limit) } } }; }
  async getCalendar(actor: Actor, filters: { from?: Date; to?: Date; facilityId?: string }) {
    const organizationId = this.requireOrganization(actor);
    const filter: Record<string, unknown> = {};
    if (filters.facilityId) filter.facilityId = filters.facilityId;
    if (filters.from || filters.to) filter.scheduledAt = { ...(filters.from ? { $gte: filters.from } : {}), ...(filters.to ? { $lte: filters.to } : {}) };
    const occurrences = await this.occurrences.findByOrganization(organizationId, { filter, limit: 500 });
    return { success: true, message: "Preventive maintenance calendar schedule retrieved", data: occurrences.map(toPMOccurrenceResponse) };
  }
  async listPlanOccurrences(planId: string, actor: Actor, options: ListOccurrenceInput) { const organizationId = this.requireOrganization(actor); const plan = await this.repository.findById(planId); if (!plan || plan.organizationId.toString() !== organizationId) throw new NotFoundException("Preventive maintenance not found"); return this.listOccurrences(actor, { ...options, preventiveMaintenanceId: planId }); }

  async assignPlan(id: string, input: AssignmentInput, actor: Actor) { if (!this.isManager(actor)) throw new AuthorizationException("Only admin or facility manager can manage PM assignments"); const organizationId = this.requireOrganization(actor); const pm = await this.repository.findById(id); if (!pm || pm.organizationId.toString() !== organizationId) throw new NotFoundException("Preventive maintenance not found"); const target = await this.resolveAssignment(input, organizationId, actor); const previous = pm.defaultAssignment; pm.defaultAssignment = target; pm.assignmentHistory.push({ action: previous ? "reassigned" : "assigned", previousTargetType: previous?.targetType, previousTargetId: previous?.targetId, targetType: target.targetType, targetId: target.targetId, actorId: new Types.ObjectId(actor.userId), occurredAt: new Date() }); await pm.save(); await eventPublisher.publish(new PreventiveMaintenancePlanUpdatedEvent(this.planPayload(pm), { organizationId, actorId: actor.userId, aggregateType: "preventive_maintenance_plan", aggregateId: pm._id.toString() })); return { success: true, message: "Preventive maintenance default assignment updated", data: toPMResponse(pm) }; }
  async clearPlanAssignment(id: string, actor: Actor) { if (!this.isManager(actor)) throw new AuthorizationException("Only admin or facility manager can manage PM assignments"); const organizationId = this.requireOrganization(actor); const pm = await this.repository.findById(id); if (!pm || pm.organizationId.toString() !== organizationId) throw new NotFoundException("Preventive maintenance not found"); const previous = pm.defaultAssignment; if (previous) { pm.assignmentHistory.push({ action: "cleared", previousTargetType: previous.targetType, previousTargetId: previous.targetId, actorId: new Types.ObjectId(actor.userId), occurredAt: new Date() }); pm.defaultAssignment = undefined; await pm.save(); await eventPublisher.publish(new PreventiveMaintenancePlanUpdatedEvent(this.planPayload(pm), { organizationId, actorId: actor.userId, aggregateType: "preventive_maintenance_plan", aggregateId: pm._id.toString() })); } return { success: true, message: "Preventive maintenance default assignment cleared", data: toPMResponse(pm) }; }
  async assignOccurrence(id: string, input: AssignmentInput, actor: Actor) { if (!this.isManager(actor)) throw new AuthorizationException("Only admin or facility manager can manage PM assignments"); const organizationId = this.requireOrganization(actor); const occurrence = await this.occurrences.findById(id); if (!occurrence || occurrence.organizationId.toString() !== organizationId) throw new NotFoundException("Preventive maintenance occurrence not found"); const target = await this.resolveAssignment(input, organizationId, actor); const previous = occurrence.assignment; occurrence.assignment = target; occurrence.assignmentHistory.push({ action: previous ? "reassigned" : "assigned", previousTargetType: previous?.targetType, previousTargetId: previous?.targetId, targetType: target.targetType, targetId: target.targetId, actorId: new Types.ObjectId(actor.userId), occurredAt: new Date() }); await occurrence.save(); await eventPublisher.publish(new PreventiveMaintenanceOccurrenceAssignmentChangedEvent(this.occurrencePayload(occurrence), { organizationId, actorId: actor.userId, aggregateType: "preventive_maintenance_occurrence", aggregateId: occurrence._id.toString() })); return { success: true, message: "Preventive maintenance occurrence assigned", data: toPMOccurrenceResponse(occurrence) }; }
  async clearOccurrenceAssignment(id: string, actor: Actor) { if (!this.isManager(actor)) throw new AuthorizationException("Only admin or facility manager can manage PM assignments"); const organizationId = this.requireOrganization(actor); const occurrence = await this.occurrences.findById(id); if (!occurrence || occurrence.organizationId.toString() !== organizationId) throw new NotFoundException("Preventive maintenance occurrence not found"); const previous = occurrence.assignment; if (previous) { occurrence.assignmentHistory.push({ action: "cleared", previousTargetType: previous.targetType, previousTargetId: previous.targetId, actorId: new Types.ObjectId(actor.userId), occurredAt: new Date() }); occurrence.assignment = undefined; await occurrence.save(); await eventPublisher.publish(new PreventiveMaintenanceOccurrenceAssignmentChangedEvent(this.occurrencePayload(occurrence), { organizationId, actorId: actor.userId, aggregateType: "preventive_maintenance_occurrence", aggregateId: occurrence._id.toString() })); } return { success: true, message: "Preventive maintenance occurrence assignment cleared", data: toPMOccurrenceResponse(occurrence) }; }
  private async resolveAssignment(input: AssignmentInput, organizationId: string, actor: Actor) { if (input.targetType === "team") throw new BusinessException("Team assignment is unavailable until a team identity contract is added"); if (input.targetType === "vendor") throw new BusinessException("Vendor assignment is unavailable until an authorized vendor relationship contract is added"); const user = await User.findById(input.targetId).select("role organizationId"); if (!user || user.role !== ROLES.TECHNICIAN || user.organizationId?.toString() !== organizationId) throw new AuthorizationException("Assignment target is not an internal technician in this organization"); return { targetType: input.targetType, targetId: new Types.ObjectId(input.targetId), assignedAt: new Date(), assignedBy: new Types.ObjectId(actor.userId) }; }
  async update(id: string, input: UpdatePMInput, actor: Actor) { const organizationId = this.requireOrganization(actor); const pm = await this.repository.findById(id); if (!pm || pm.organizationId.toString() !== organizationId) throw new NotFoundException("Preventive maintenance not found"); if (pm.status !== "pending_approval" && input.status !== "cancelled") throw new BusinessException("Only pending maintenance can be edited"); const updated = await this.repository.update(id, organizationId, input); if (!updated) throw new NotFoundException("Preventive maintenance not found"); await eventPublisher.publish(new PreventiveMaintenancePlanUpdatedEvent(this.planPayload(updated), { organizationId, actorId: actor.userId, aggregateType: "preventive_maintenance_plan", aggregateId: updated._id.toString() })); return { success: true, message: "Preventive maintenance updated successfully", data: toPMResponse(updated) }; }
  async archive(id: string, actor: Actor) { const organizationId = this.requireOrganization(actor); const pm = await this.repository.findById(id); if (!pm || pm.organizationId.toString() !== organizationId) throw new NotFoundException("Preventive maintenance not found"); const occurrences = await this.occurrences.findByPlan(organizationId, id, { limit: 1000 }); if (occurrences.some((item) => item.status === "generated" || item.status === "completed")) throw new BusinessException("Generated maintenance cannot be archived"); for (const occurrence of occurrences) { occurrence.status = "cancelled"; await occurrence.save(); await eventPublisher.publish(new PreventiveMaintenanceOccurrenceCancelledEvent(this.occurrencePayload(occurrence), { organizationId, actorId: actor.userId, aggregateType: "preventive_maintenance_occurrence", aggregateId: occurrence._id.toString() })); } const updated = await this.repository.update(id, organizationId, { status: "cancelled", isActive: false }); await eventPublisher.publish(new PreventiveMaintenancePlanCancelledEvent(this.planPayload(updated!), { organizationId, actorId: actor.userId, aggregateType: "preventive_maintenance_plan", aggregateId: updated!._id.toString() })); return { success: true, message: "Preventive maintenance archived successfully", data: toPMResponse(updated!) }; }
  private async generateWorkOrder(pm: IPMPlan, actor: Actor, occurrence: IPMOccurrence) { if (occurrence.workOrderId) { const existing = await new WorkOrderRepository().findById(occurrence.workOrderId.toString()); if (existing) return existing; } const technicianId = occurrence.assignment?.targetType === "user" ? occurrence.assignment.targetId.toString() : undefined; const result = await this.workOrders.create({ organizationId: pm.organizationId.toString(), facilityId: pm.facilityId.toString(), assetId: pm.assetId.toString(), locationId: pm.locationId.toString(), title: pm.title, description: `${pm.description}${pm.instructions ? `\n\nInstructions: ${pm.instructions}` : ""}`, priority: pm.priority, serviceCategory: pm.maintenanceType, dueDate: occurrence.scheduledAt, fulfillmentType: technicianId ? "internal" : "marketplace", ...(technicianId ? { technicianId } : {}) }, actor); if (!result.data) throw new BusinessException("Unable to create work order"); await assetHistoryService.append({ organizationId: pm.organizationId.toString(), assetId: pm.assetId.toString(), event: ASSET_HISTORY_EVENTS.WORK_ORDER_CREATED, description: "Work order generated from preventive maintenance occurrence", actorId: actor.userId, sourceType: "preventive_maintenance_occurrence", sourceId: occurrence._id.toString(), data: { workOrderId: result.data._id.toString() } }); return result.data; }

  private planPayload(pm: IPMPlan) { return { planId: pm._id.toString(), facilityId: pm.facilityId.toString(), locationId: pm.locationId.toString(), assetId: pm.assetId.toString(), status: pm.status }; }
  private occurrencePayload(occurrence: IPMOccurrence) { return { planId: occurrence.preventiveMaintenanceId.toString(), occurrenceId: occurrence._id.toString(), facilityId: occurrence.facilityId.toString(), locationId: occurrence.locationId.toString(), assetId: occurrence.assetId.toString(), ...(occurrence.workOrderId ? { workOrderId: occurrence.workOrderId.toString() } : {}), status: occurrence.status, scheduledAt: occurrence.scheduledAt.toISOString() }; }
  private async publishOccurrenceApproved(pm: IPMPlan, occurrence: IPMOccurrence, actorId: string, workOrderId: string) { const metadata = { organizationId: pm.organizationId.toString(), actorId, aggregateType: "preventive_maintenance_occurrence", aggregateId: occurrence._id.toString() }; await eventPublisher.publish(new PreventiveMaintenanceOccurrenceApprovedEvent({ ...this.occurrencePayload(occurrence), workOrderId }, metadata)); await eventPublisher.publish(new PreventiveMaintenanceOccurrenceLinkedToWorkOrderEvent({ ...this.occurrencePayload(occurrence), workOrderId }, metadata)); }

  async skip(id: string, reason: string, actor: Actor) {
    if (!this.isManager(actor)) throw new AuthorizationException("Only admin or facility manager can skip a PM plan");
    const organizationId = this.requireOrganization(actor);
    const pm = await this.repository.findById(id);
    if (!pm || pm.organizationId.toString() !== organizationId) throw new NotFoundException("Preventive maintenance not found");
    if (!pm.isActive || pm.status !== "approved") throw new BusinessException("Only active, approved plans can be skipped");
    if (!pm.recurrence) throw new BusinessException("Non-recurring plans cannot be skipped");

    const originalDueDate = pm.plannedDate;

    // Cancel the current scheduled occurrence if one exists
    const scheduledOccurrence = await this.occurrences.findBySchedule(pm._id.toString(), originalDueDate);
    if (scheduledOccurrence && !["completed", "cancelled"].includes(scheduledOccurrence.status)) {
      scheduledOccurrence.status = "cancelled";
      scheduledOccurrence.rejectionReason = `Skipped: ${reason}`;
      await scheduledOccurrence.save();
      await eventPublisher.publish(new PreventiveMaintenanceOccurrenceCancelledEvent(
        this.occurrencePayload(scheduledOccurrence),
        { organizationId, actorId: actor.userId, aggregateType: "preventive_maintenance_occurrence", aggregateId: scheduledOccurrence._id.toString() },
      ));
    }

    // Calculate the next occurrence date
    const horizon = new Date(Date.now() + HORIZON_DAYS * 86_400_000);
    const futureDates = generateOccurrenceDates(pm.recurrence, horizon).filter(d => d > originalDueDate);
    const nextDate = futureDates[0];
    if (!nextDate) throw new BusinessException("No future occurrence dates available; plan has reached its end");

    // Record skip in history
    pm.skipHistory = pm.skipHistory ?? [];
    pm.skipHistory.push({
      skippedAt: new Date(),
      skippedBy: new Types.ObjectId(actor.userId),
      originalDueDate,
      reason,
    });
    pm.plannedDate = nextDate;
    pm.occurrenceDate = nextDate;
    await pm.save();

    // Create the next occurrence
    await this.createOccurrence(pm, nextDate, actor, true);

    await eventPublisher.publish(new PreventiveMaintenanceSkippedEvent(
      { ...this.planPayload(pm), scheduledAt: originalDueDate.toISOString(), reason },
      { organizationId, actorId: actor.userId, aggregateType: "preventive_maintenance_plan", aggregateId: pm._id.toString() },
    ));

    return { success: true, message: "Preventive maintenance plan skipped to next occurrence", data: toPMResponse(pm) };
  }
}
