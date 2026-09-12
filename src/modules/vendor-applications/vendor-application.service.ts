import { Types } from "mongoose";
import {
  AuthorizationException,
  NotFoundException,
  BusinessException,
  ConflictException,
} from "@/shared/errors/index.js";
import { ROLES } from "@/shared/constants/roles.js";
import type { UserRole } from "@/shared/constants/roles.js";
import {
  FULFILLMENT_TYPE,
  WORK_ORDER_STATUS,
} from "@/shared/constants/work-order-status.js";
import { User } from "@/modules/users/user.model.js";
import { Vendor } from "@/modules/vendors/vendor.model.js";
import { WorkOrder } from "@/modules/work-orders/work-order.model.js";
import { WorkOrderService } from "@/modules/work-orders/work-order.service.js";
import { eventPublisher } from "@/container/index.js";
import { BusinessFactEvent } from "@/infrastructure/events/business-fact.event.js";
import type { CreateVendorApplicationInput } from "./vendor-application.schema.js";
import { toVendorApplicationResponse } from "./vendor-application.mapper.js";
import { VendorApplicationRepository } from "./vendor-application.repository.js";
import type { ApplicationResult } from "@/shared/application-result/index.js";
import { VendorApplication } from "./vendor-application.model.js";
import { ProcurementEventsService } from "@/modules/procurement/procurement-events.service.js";

type Actor = {
  userId: string;
  role: UserRole;
  organizationId?: string;
  vendorId?: string;
};

const applicantRoles: readonly string[] = [ROLES.VENDOR_LEAD, ROLES.VENDOR_MANAGER];

export class VendorApplicationService {
  private repository = new VendorApplicationRepository();
  private workOrders = new WorkOrderService();
  private events = new ProcurementEventsService();

  async create(data: CreateVendorApplicationInput, actor: Actor): Promise<ApplicationResult<unknown>> {
    if (!applicantRoles.includes(actor.role as typeof applicantRoles[number])) {
      throw new AuthorizationException("Only vendor lead or vendor manager can apply");
    }

    const user = await User.findById(actor.userId).select("vendorId");

    if (!user?.vendorId) {
      throw new AuthorizationException("Vendor user is not attached to a vendor");
    }

    const vendor = await Vendor.findById(user.vendorId).select(
      "serviceCategories status",
    );

    if (!vendor || vendor.status !== "active") {
      throw new AuthorizationException("Vendor is not active");
    }

    const workOrder = await WorkOrder.findById(data.workOrderId);

    if (!workOrder) {
      throw new NotFoundException("Work order not found");
    }

    const eligible = await this.workOrders.listOpenForVendor(actor);
    if (!eligible.data?.some((item) => item._id.toString() === data.workOrderId)) throw new AuthorizationException("Vendor is not eligible for this marketplace work order");

    if (
      workOrder.fulfillmentType !== FULFILLMENT_TYPE.MARKETPLACE ||
      workOrder.status !== WORK_ORDER_STATUS.OPEN ||
      workOrder.assignedVendorId
    ) {
      throw new BusinessException(
        "Only open marketplace work orders accept applications",
      );
    }

    if (!vendor.serviceCategories.includes(workOrder.serviceCategory)) {
      throw new AuthorizationException("Vendor does not service this category");
    }

    const existing = await this.repository.findOne(
      data.workOrderId,
      user.vendorId.toString(),
    );

    if (existing) {
      throw new ConflictException("Vendor has already applied to this work order");
    }

    const application: Record<string, unknown> = {
      organizationId: workOrder.organizationId,
      workOrderId: new Types.ObjectId(data.workOrderId),
      vendorId: user.vendorId,
      appliedBy: new Types.ObjectId(actor.userId),
      status: "submitted",
    };

    if (data.note) {
      application.note = data.note;
    }

    const created = await this.repository.create(application);
    await this.events.auditEvent({ action: "procurement.application_submitted", actorId: actor.userId, organizationId: workOrder.organizationId.toString(), entityId: created._id.toString(), metadata: { vendorId: user.vendorId.toString(), workOrderId: workOrder._id.toString() } });
    await this.events.notifyOrganization(workOrder.organizationId.toString(), actor.userId, created._id.toString(), "New vendor application", "A vendor submitted an application for a marketplace Work Order.");

    return {
      success: true,
      message: "Vendor application submitted successfully",
      data: toVendorApplicationResponse(created),
    };
  }

  async listByWorkOrder(workOrderId: string, actor: Actor): Promise<ApplicationResult<unknown[]>> {
    if (![ROLES.ADMIN, ROLES.FACILITY_MANAGER].includes(actor.role as "admin" | "facility_manager") || !actor.organizationId) throw new AuthorizationException("Organization review access required");
    const workOrder = await WorkOrder.findOne({ _id: workOrderId, organizationId: actor.organizationId });
    if (!workOrder) throw new NotFoundException("Work order not found");
    const applications = await this.repository.findByWorkOrder(workOrderId);

    return {
      success: true,
      message: "Vendor applications retrieved successfully",
      data: applications.map(toVendorApplicationResponse),
    };
  }
  async listForVendor(actor: Actor): Promise<ApplicationResult<unknown[]>> { if (!applicantRoles.includes(actor.role as typeof applicantRoles[number]) || !actor.vendorId) throw new AuthorizationException("Vendor application access required"); const applications = await this.repository.findByVendor(actor.vendorId); return { success: true, message: "Vendor applications retrieved successfully", data: applications.map((application) => toVendorApplicationResponse(application)) }; }
  async updateStatus(id: string, status: "under_review" | "rejected" | "awarded", actor: Actor): Promise<ApplicationResult<unknown>> { if (![ROLES.ADMIN, ROLES.FACILITY_MANAGER].includes(actor.role as "admin" | "facility_manager") || !actor.organizationId) throw new AuthorizationException("Organization review access required"); const application = await this.repository.findById(id); if (!application) throw new NotFoundException("Vendor application not found"); const workOrder = await WorkOrder.findOne({ _id: application.workOrderId, organizationId: actor.organizationId }); if (!workOrder) throw new NotFoundException("Vendor application not found"); if (application.status === "awarded" || application.status === "withdrawn") throw new BusinessException("Application can no longer be reviewed"); if (status === "awarded") { if (workOrder.status !== WORK_ORDER_STATUS.OPEN || workOrder.assignedVendorId) throw new ConflictException("Work order is no longer available"); workOrder.assignedVendorId = application.vendorId; workOrder.status = WORK_ORDER_STATUS.ASSIGNED; await workOrder.save(); await VendorApplication.updateMany({ workOrderId: application.workOrderId, _id: { $ne: application._id }, status: { $nin: ["withdrawn", "rejected"] } }, { status: "rejected" }); } const updated = await this.repository.update(id, { status }); await eventPublisher.publish(new BusinessFactEvent("VendorApplicationStatusChanged", { applicationId: id, vendorId: application.vendorId.toString(), workOrderId: application.workOrderId.toString() }, { organizationId: actor.organizationId, actorId: actor.userId, aggregateType: "vendor_application", aggregateId: id })); return { success: true, message: "Vendor application status updated", data: toVendorApplicationResponse(updated!) }; }
  async withdraw(id: string, actor: Actor): Promise<ApplicationResult<unknown>> { if (!applicantRoles.includes(actor.role) || !actor.vendorId) throw new AuthorizationException("Vendor application access required"); const application = await this.repository.findById(id); if (!application || application.vendorId.toString() !== actor.vendorId) throw new NotFoundException("Vendor application not found"); if (["awarded", "rejected"].includes(application.status)) throw new BusinessException("Application can no longer be withdrawn"); const updated = await this.repository.update(id, { status: "withdrawn" }); return { success: true, message: "Vendor application withdrawn", data: toVendorApplicationResponse(updated!) }; }
}
