import { Types } from "mongoose";
import { AuthorizationException, NotFoundException, BusinessException } from "@/shared/errors/index.js";
import { ROLES } from "@/shared/constants/roles.js";
import { User } from "@/modules/users/user.model.js";
import { VendorApplication } from "@/modules/vendor-applications/vendor-application.model.js";
import { WorkOrder } from "@/modules/work-orders/work-order.model.js";
import { SlaAgreementRepository } from "./sla-agreement.repository.js";
import type { CreateSlaAgreementInput } from "./sla-agreement.schema.js";
import type { ApplicationResult } from "@/shared/application-result/index.js";
import type { ISlaAgreement } from "./sla-agreement.model.js";
import { ProcurementEventsService } from "@/modules/procurement/procurement-events.service.js";

type Actor = {
  userId: string;
  role: string;
  organizationId?: string;
  vendorId?: string;
};

const participantRoles: string[] = [
  ROLES.ADMIN,
  ROLES.FACILITY_MANAGER,
  ROLES.VENDOR_LEAD,
  ROLES.VENDOR_MANAGER,
];

export class SlaAgreementService {
  private repository = new SlaAgreementRepository();
  private events = new ProcurementEventsService();

  async create(data: CreateSlaAgreementInput, actor: Actor): Promise<ApplicationResult<ISlaAgreement>> {
    if (!participantRoles.includes(actor.role)) {
      throw new AuthorizationException("This role cannot create SLA agreements");
    }

    const application = await VendorApplication.findById(
      data.vendorApplicationId,
    );

    if (!application) {
      throw new NotFoundException("Vendor application not found");
    }

    const workOrder = await WorkOrder.findById(application.workOrderId).select("organizationId");
    if (!workOrder) throw new NotFoundException("Work order not found");

    // The application and its work order are both tenant-owned. Do not let an
    // organization create an SLA from an application belonging to another
    // organization, even when the referenced work order is otherwise valid.
    if (actor.organizationId && application.organizationId.toString() !== actor.organizationId) {
      throw new AuthorizationException("Application is outside the organization scope");
    }
    if (actor.organizationId && workOrder.organizationId.toString() !== actor.organizationId) {
      throw new AuthorizationException("Work order is outside the organization scope");
    }

    if (
      actor.role === ROLES.VENDOR_LEAD ||
      actor.role === ROLES.VENDOR_MANAGER
    ) {
      const user = await User.findById(actor.userId).select("vendorId");

      if (!user?.vendorId || !application.vendorId.equals(user.vendorId)) {
        throw new AuthorizationException("Vendor cannot manage this SLA");
      }
    }

    const agreement: Record<string, unknown> = {
      organizationId: workOrder.organizationId,
      vendorApplicationId: application._id,
      workOrderId: application.workOrderId,
      vendorId: application.vendorId,
      responseTimeHours: data.responseTimeHours,
      resolutionTimeHours: data.resolutionTimeHours,
      warrantyPeriodDays: data.warrantyPeriodDays,
      status: "proposed",
      createdBy: new Types.ObjectId(actor.userId),
    };

    if (data.penaltyTerms) {
      agreement.penaltyTerms = data.penaltyTerms;
    }

    if (data.notes) {
      agreement.notes = data.notes;
    }

    const created = await this.repository.create(agreement);
    await this.events.auditEvent({ action: "procurement.sla_proposed", actorId: actor.userId, organizationId: workOrder.organizationId.toString(), entityId: created._id.toString() });

    return {
      success: true,
      message: "SLA agreement created successfully",
      data: created,
    };
  }

  async listByApplication(vendorApplicationId: string, actor: Actor): Promise<ApplicationResult<ISlaAgreement[]>> {
    const application = await VendorApplication.findById(vendorApplicationId);
    if (!application) throw new NotFoundException("Vendor application not found");
    if (actor.organizationId && application.organizationId.toString() !== actor.organizationId) {
      throw new AuthorizationException("Application is outside the organization scope");
    }
    if (actor.vendorId && application.vendorId.toString() !== actor.vendorId) {
      throw new AuthorizationException("Application is outside the vendor scope");
    }
    const agreements = await this.repository.findByApplication(vendorApplicationId);

    return {
      success: true,
      message: "SLA agreements retrieved successfully",
      data: agreements,
    };
  }

  async listForVendor(actor: Actor): Promise<ApplicationResult<ISlaAgreement[]>> {
    if (!actor.vendorId || ![ROLES.VENDOR_LEAD, ROLES.VENDOR_MANAGER].includes(actor.role as typeof ROLES.VENDOR_LEAD)) throw new AuthorizationException("Vendor SLA access required");
    return { success: true, message: "Vendor SLA agreements retrieved successfully", data: await this.repository.findByVendor(actor.vendorId) };
  }

  async updateStatus(id: string, status: "proposed" | "accepted" | "rejected" | "active" | "terminated", actor: Actor): Promise<ApplicationResult<ISlaAgreement>> {
    const agreement = await this.repository.findById(id);
    if (!agreement) throw new NotFoundException("SLA agreement not found");
    const application = await VendorApplication.findById(agreement.vendorApplicationId);
    if (!application) throw new NotFoundException("Vendor application not found");
    const isOrg = [ROLES.ADMIN, ROLES.FACILITY_MANAGER].includes(actor.role as typeof ROLES.ADMIN);
    if (isOrg && (!actor.organizationId || agreement.organizationId.toString() !== actor.organizationId)) throw new AuthorizationException("SLA is outside the organization scope");
    if (!isOrg && (!actor.vendorId || agreement.vendorId.toString() !== actor.vendorId)) throw new AuthorizationException("SLA is outside the vendor scope");
    const allowed: Record<string, string[]> = { draft: ["proposed"], proposed: ["accepted", "rejected"], accepted: ["active"], active: ["terminated"] };
    if (!allowed[agreement.status]?.includes(status)) throw new BusinessException("Invalid SLA status transition");
    const updated = await this.repository.update(id, { status, ...(status === "active" ? { effectiveAt: new Date() } : {}) });
    return { success: true, message: "SLA status updated", data: updated! };
  }
}
