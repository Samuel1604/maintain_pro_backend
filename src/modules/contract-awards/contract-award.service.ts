import mongoose from "mongoose";
import { ContractAwardRepository } from "./contract-award.repository.js";
import { User } from "@/modules/users/user.model.js";
import { VendorApplication } from "@/modules/vendor-applications/vendor-application.model.js";
import { WorkOrder } from "@/modules/work-orders/work-order.model.js";
import { ContractAwardWorkOrder } from "./contract-award-work-order.model.js";
import {
  AuthorizationException,
  NotFoundException,
  BusinessException,
  ValidationException,
  ConflictException,
  InternalServerException,
} from "@/shared/errors/index.js";
import { ROLES } from "@/shared/constants/roles.js";
import type { CreateContractAwardInput, RenewContractAwardInput } from "./contract-award.schema.js";
import { WORK_ORDER_STATUS } from "@/shared/constants/work-order-status.js";
import type { ApplicationResult } from "@/shared/application-result/index.js";
import type { IContractAward } from "./contract-award.model.js";
import { toObjectId } from "@/shared/validators/index.js";
import { ProcurementEventsService } from "@/modules/procurement/procurement-events.service.js";

type Actor = {
  userId: string;
  role: string;
  organizationId?: string;
  vendorId?: string;
};

const managerRoles: string[] = [ROLES.ADMIN, ROLES.FACILITY_MANAGER];

export class ContractAwardService {
  private repository = new ContractAwardRepository();
  private events = new ProcurementEventsService();

  async create(
    data: CreateContractAwardInput,
    actor: Actor,
  ): Promise<ApplicationResult<IContractAward>> {
    if (!managerRoles.includes(actor.role) || !actor.organizationId) {
      throw new AuthorizationException(
        "Only admin or facility manager can award contracts",
      );
    }

    const application = await VendorApplication.findById(
      data.vendorApplicationId,
    );

    if (!application) {
      throw new NotFoundException("Vendor application not found");
    }

    if (application.organizationId.toString() !== actor.organizationId) {
      throw new NotFoundException("Vendor application not found");
    }

    const workOrder = await WorkOrder.findOne({
      _id: application.workOrderId,
      organizationId: actor.organizationId,
    });

    if (!workOrder) {
      throw new NotFoundException("Work order not found");
    }

    if (workOrder.status !== WORK_ORDER_STATUS.BIDDING_OPEN) {
      throw new BusinessException("Work order is not open for bidding award");
    }

    if (data.assignedVendorTechnicianId) {
      const technician = await User.findById(data.assignedVendorTechnicianId);

      if (
        !technician ||
        !technician.vendorId ||
        !technician.vendorId.equals(application.vendorId) ||
        technician.role !== ROLES.VENDOR_TECHNICIAN
      ) {
        throw new ValidationException(
          "Invalid vendor technician for this contract award",
        );
      }
    }

    const existingAward = await this.repository.findByWorkOrder(
      workOrder._id.toString(),
    );

    if (existingAward) {
      throw new ConflictException("Work order has already been awarded");
    }

    const session = await mongoose.startSession();
    let award: IContractAward | undefined;
    try {
      await session.withTransaction(async () => {
        award = await this.repository.create({
          organizationId: workOrder.organizationId,
          workOrderId: workOrder._id,
          vendorApplicationId: application._id,
          vendorId: application.vendorId,
          ...(data.quotationId && { quotationId: data.quotationId }),
          ...(data.slaAgreementId && { slaAgreementId: data.slaAgreementId }),
          awardedBy: actor.userId,
          ...(data.assignedVendorTechnicianId && { assignedVendorTechnicianId: data.assignedVendorTechnicianId }),
          ...(data.notes && { notes: data.notes }),
          status: "awarded",
        }, session);

        application.status = "awarded";
        await application.save({ session });
        await VendorApplication.updateMany(
          { workOrderId: workOrder._id, _id: { $ne: application._id }, status: { $in: ["submitted", "under_review"] } },
          { $set: { status: "rejected" } },
          { session },
        );
        workOrder.status = WORK_ORDER_STATUS.ASSIGNED;
        workOrder.assignedVendorId = application.vendorId;
        workOrder.vendorOfferStatus = "pending_acceptance";
        if (data.assignedVendorTechnicianId) workOrder.assignedVendorTechnicianId = toObjectId(data.assignedVendorTechnicianId);
        await workOrder.save({ session });
      });
    } finally {
      await session.endSession();
    }
    if (!award) throw new InternalServerException("Contract award transaction did not produce an award");
    await this.events.auditEvent({ action: "procurement.award_created", actorId: actor.userId, organizationId: workOrder.organizationId.toString(), entityId: award._id.toString() });

    return {
      success: true,
      message: "Contract awarded successfully",
      data: award,
    };
  }

  async list(actor: Actor): Promise<ApplicationResult<IContractAward[]>> {
    if (![...managerRoles, ROLES.FINANCE].includes(actor.role) || !actor.organizationId) throw new AuthorizationException("Organization award access required");
    return { success: true, message: "Contract awards retrieved successfully", data: await this.repository.findByOrganization(actor.organizationId) };
  }
  async listForVendor(actor: Actor): Promise<ApplicationResult<IContractAward[]>> {
    const vendorRoles = [ROLES.VENDOR_LEAD, ROLES.VENDOR_MANAGER, ROLES.VENDOR_TECHNICIAN];
    if (!vendorRoles.includes(actor.role as typeof ROLES.VENDOR_LEAD) || !actor.vendorId) throw new AuthorizationException("Vendor contract access required");
    return { success: true, message: "Vendor contract awards retrieved successfully", data: await this.repository.findByVendor(actor.vendorId) };
  }
  async renew(id: string, data: RenewContractAwardInput, actor: Actor): Promise<ApplicationResult<IContractAward>> {
    if (!managerRoles.includes(actor.role) || !actor.organizationId) throw new AuthorizationException("Organization award access required");
    const award = await this.repository.findById(id);
    if (!award || award.organizationId.toString() !== actor.organizationId) throw new NotFoundException("Contract award not found");
    if (!["active", "completed"].includes(award.status)) throw new BusinessException("Only active or completed contracts can be renewed");
    const updated = await this.repository.update(id, { effectiveAt: data.effectiveAt, expiresAt: data.expiresAt, notes: data.notes ?? award.notes, status: "active" });
    await this.events.auditEvent({ action: "procurement.award_renewed", actorId: actor.userId, organizationId: actor.organizationId, entityId: id });
    return { success: true, message: "Contract award renewed", data: updated! };
  }

  async updateStatus(id: string, status: "awarded" | "active" | "completed" | "terminated" | "cancelled", actor: Actor): Promise<ApplicationResult<IContractAward>> {
    if (!managerRoles.includes(actor.role) || !actor.organizationId) throw new AuthorizationException("Organization award access required");
    const award = await this.repository.findById(id);
    if (!award || award.organizationId.toString() !== actor.organizationId) throw new NotFoundException("Contract award not found");
    const allowed: Record<string, string[]> = { pending_approval: ["awarded", "cancelled"], awarded: ["active", "cancelled"], active: ["completed", "terminated"] };
    if (!allowed[award.status]?.includes(status)) throw new BusinessException("Invalid contract award status transition");
    const updated = await this.repository.update(id, { status, ...(status === "active" ? { effectiveAt: new Date() } : {}) });
    await this.events.auditEvent({ action: status === "active" ? "procurement.award_activated" : "procurement.award_terminated", actorId: actor.userId, organizationId: actor.organizationId, entityId: id, metadata: { status } });
    return { success: true, message: "Contract award status updated", data: updated! };
  }

  async addWorkOrder(awardId: string, workOrderId: string, actor: Actor) {
    if (!managerRoles.includes(actor.role) || !actor.organizationId) throw new AuthorizationException("Organization award access required");
    const award = await this.repository.findById(awardId);
    if (!award || award.organizationId.toString() !== actor.organizationId || award.status !== "active") throw new BusinessException("Only active awards can cover Work Orders");
    const workOrder = await WorkOrder.findOne({ _id: workOrderId, organizationId: actor.organizationId });
    if (!workOrder || workOrder.fulfillmentType !== "marketplace" || workOrder.serviceCategory !== (await WorkOrder.findById(award.workOrderId))?.serviceCategory) throw new ValidationException("Work Order is not eligible for this award");
    if (await this.repository.findWorkOrder(awardId, workOrderId)) throw new ConflictException("Work Order is already associated with this award");
    const existing = await ContractAwardWorkOrder.findOne({ workOrderId, removedAt: { $exists: false } });
    if (existing) throw new ConflictException("Work Order is already covered by an award");
    return this.repository.addWorkOrder({ organizationId: actor.organizationId, contractAwardId: award._id, workOrderId: workOrder._id, associatedBy: actor.userId });
  }

  async listWorkOrders(awardId: string, actor: Actor) {
    const vendorRoles = [ROLES.VENDOR_LEAD, ROLES.VENDOR_MANAGER, ROLES.VENDOR_TECHNICIAN];
    if (!actor.organizationId && !actor.vendorId) throw new AuthorizationException("Contract award access required");
    const award = await this.repository.findById(awardId);
    const organizationAccess = Boolean(actor.organizationId && award?.organizationId.toString() === actor.organizationId);
    const vendorAccess = Boolean(actor.vendorId && vendorRoles.includes(actor.role as typeof ROLES.VENDOR_LEAD) && award?.vendorId.toString() === actor.vendorId);
    if (!award || (!organizationAccess && !vendorAccess)) throw new NotFoundException("Contract award not found");
    return this.repository.listWorkOrders(awardId);
  }

  async removeWorkOrder(awardId: string, workOrderId: string, actor: Actor) {
    if (!managerRoles.includes(actor.role) || !actor.organizationId) throw new AuthorizationException("Organization award access required");
    const award = await this.repository.findById(awardId);
    if (!award || award.organizationId.toString() !== actor.organizationId || award.status !== "active") throw new BusinessException("Only active awards can change Work Orders");
    return this.repository.removeWorkOrder(awardId, workOrderId);
  }
}
