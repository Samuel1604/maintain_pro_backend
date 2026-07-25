import { Types } from "mongoose";
import { AppError } from "@/shared/errors/AppError.js";
import { ROLES } from "@/shared/constants/roles.js";
import {
  FULFILLMENT_TYPE,
  WORK_ORDER_STATUS,
} from "@/shared/constants/work-order-status.js";
import { User } from "@/modules/users/user.model.js";
import { Vendor } from "@/modules/vendors/vendor.model.js";
import { Facility } from "@/modules/facilities/facility.model.js";
import type {
  CreateWorkOrderInput,
  RejectCompletionInput,
  UpdateProgressInput,
} from "./work-order.schema.js";
import { WorkOrderRepository } from "./work-order.repository.js";

type Actor = {
  userId: string;
  role: string;
};

const managerRoles: string[] = [ROLES.ADMIN, ROLES.FACILITY_MANAGER];
const vendorApplicantRoles: string[] = [
  ROLES.VENDOR_LEAD,
  ROLES.VENDOR_MANAGER,
];

const toObjectId = (id: string) => new Types.ObjectId(id);

const sameId = (left: Types.ObjectId | undefined, right: string) =>
  Boolean(left?.equals(toObjectId(right)));

export class WorkOrderService {
  private repository = new WorkOrderRepository();

  async create(data: CreateWorkOrderInput, actor: Actor) {
    this.assertManager(actor);

    const base = {
      organizationId: toObjectId(data.organizationId),
      facilityId: toObjectId(data.facilityId),
      title: data.title,
      description: data.description,
      priority: data.priority,
      serviceCategory: data.serviceCategory,
      fulfillmentType: data.fulfillmentType,
      createdBy: toObjectId(actor.userId),
    };

    const optionalRefs: {
      assetId?: Types.ObjectId;
      serviceRequestId?: Types.ObjectId;
    } = {};

    if (data.assetId) {
      optionalRefs.assetId = toObjectId(data.assetId);
    }

    if (data.fulfillmentType === FULFILLMENT_TYPE.MARKETPLACE) {
      return this.repository.create({
        ...base,
        ...optionalRefs,
        status: WORK_ORDER_STATUS.OPEN,
      });
    }

    const technicianId = data.technicianId;

    if (!technicianId) {
      throw new AppError("technicianId is required", 400);
    }

    await this.assertInternalTechnician(technicianId, data.organizationId);

    return this.repository.create({
      ...base,
      ...optionalRefs,
      status: WORK_ORDER_STATUS.ASSIGNED,
      assignedTechnicianId: toObjectId(technicianId),
    });
  }

  async createFromServiceRequest(
    data: CreateWorkOrderInput & { serviceRequestId: string },
    actor: Actor,
  ) {
    const workOrder = await this.create(data, actor);
    workOrder.serviceRequestId = toObjectId(data.serviceRequestId);
    return workOrder.save();
  }

  async listOpenForVendor(actor: Actor) {
    this.assertVendorApplicant(actor);

    const user = await User.findById(actor.userId).select("vendorId");

    if (!user?.vendorId) {
      throw new AppError("Vendor user is not attached to a vendor", 403);
    }

    const vendor = await Vendor.findById(user.vendorId).select(
      "serviceCategories serviceAreas coverageRadiusKm baseCoordinates status",
    );

    if (!vendor || vendor.status !== "active") {
      throw new AppError("Vendor is not active", 403);
    }

    const query: Record<string, unknown> = {
      status: WORK_ORDER_STATUS.OPEN,
      fulfillmentType: FULFILLMENT_TYPE.MARKETPLACE,
      assignedVendorId: { $exists: false },
      serviceCategory: { $in: vendor.serviceCategories },
    };

    if (vendor.serviceAreas.length > 0) {
      query.facilityId = { $in: vendor.serviceAreas };
    }

    if (
      vendor.coverageRadiusKm &&
      vendor.coverageRadiusKm > 0 &&
      vendor.baseCoordinates
    ) {
      const nearbyFacilityIds = await Facility.find({
        coordinates: {
          $near: {
            $geometry: {
              type: "Point",
              coordinates: vendor.baseCoordinates.coordinates,
            },
            $maxDistance: vendor.coverageRadiusKm * 1000,
          },
        },
      }).distinct("_id");

      query.facilityId =
        vendor.serviceAreas.length > 0
          ? {
              $in: vendor.serviceAreas.filter((id) =>
                nearbyFacilityIds.some((nearbyId) => nearbyId.equals(id)),
              ),
            }
          : { $in: nearbyFacilityIds };
    }

    return this.repository.findOpenMarketplace(query);
  }

  async updateProgress(
    workOrderId: string,
    data: UpdateProgressInput,
    actor: Actor,
  ) {
    const workOrder = await this.repository.findById(workOrderId);

    if (!workOrder) {
      throw new AppError("Work order not found", 404);
    }

    if (!this.isAssignedWorker(workOrder, actor)) {
      throw new AppError("Only the assigned worker can update progress", 403);
    }

    if (
      data.status === WORK_ORDER_STATUS.IN_PROGRESS &&
      workOrder.status !== WORK_ORDER_STATUS.ASSIGNED
    ) {
      throw new AppError(
        "Work order must be assigned before progress starts",
        400,
      );
    }

    if (
      data.status === WORK_ORDER_STATUS.PENDING_COMPLETION &&
      workOrder.status !== WORK_ORDER_STATUS.IN_PROGRESS
    ) {
      throw new AppError(
        "Work order must be in progress before completion review",
        400,
      );
    }

    workOrder.status = data.status;
    return workOrder.save();
  }

  async approveCompletion(workOrderId: string, actor: Actor) {
    this.assertManager(actor);

    const workOrder = await this.repository.findById(workOrderId);

    if (!workOrder) {
      throw new AppError("Work order not found", 404);
    }

    if (workOrder.status !== WORK_ORDER_STATUS.PENDING_COMPLETION) {
      throw new AppError(
        "Only pending completion work orders can be approved",
        400,
      );
    }

    const now = new Date();
    workOrder.status = WORK_ORDER_STATUS.COMPLETED;
    workOrder.approvedBy = toObjectId(actor.userId);
    workOrder.approvedAt = now;
    workOrder.completedAt = now;

    return workOrder.save();
  }

  async rejectCompletion(
    workOrderId: string,
    data: RejectCompletionInput,
    actor: Actor,
  ) {
    this.assertManager(actor);

    const workOrder = await this.repository.findById(workOrderId);

    if (!workOrder) {
      throw new AppError("Work order not found", 404);
    }

    if (workOrder.status !== WORK_ORDER_STATUS.PENDING_COMPLETION) {
      throw new AppError(
        "Only pending completion work orders can be rejected",
        400,
      );
    }

    workOrder.status = WORK_ORDER_STATUS.IN_PROGRESS;
    workOrder.rejectionReason = data.rejectionReason;
    workOrder.reviewedBy = toObjectId(actor.userId);
    workOrder.reviewedAt = new Date();

    return workOrder.save();
  }

  private assertManager(actor: Actor) {
    if (!managerRoles.includes(actor.role)) {
      throw new AppError(
        "Only admin or facility manager can perform this action",
        403,
      );
    }
  }

  private assertVendorApplicant(actor: Actor) {
    if (!vendorApplicantRoles.includes(actor.role)) {
      throw new AppError("Only vendor lead or vendor manager can apply", 403);
    }
  }

  private async assertInternalTechnician(
    technicianId: string,
    organizationId: string,
  ) {
    const technician = await User.findById(technicianId).select(
      "role organizationId",
    );

    if (!technician || technician.role !== ROLES.TECHNICIAN) {
      throw new AppError("Only internal technicians can be assigned", 400);
    }

    if (!sameId(technician.organizationId, organizationId)) {
      throw new AppError(
        "Technician does not belong to this organization",
        400,
      );
    }
  }

  private isAssignedWorker(
    workOrder: {
      assignedTechnicianId?: Types.ObjectId;
      assignedVendorTechnicianId?: Types.ObjectId;
    },
    actor: Actor,
  ) {
    if (actor.role === ROLES.TECHNICIAN) {
      return sameId(workOrder.assignedTechnicianId, actor.userId);
    }

    if (actor.role === ROLES.VENDOR_TECHNICIAN) {
      return sameId(workOrder.assignedVendorTechnicianId, actor.userId);
    }

    return false;
  }
}
