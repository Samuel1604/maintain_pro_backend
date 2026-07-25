import { Types } from "mongoose";
import { AppError } from "@/shared/errors/AppError.js";
import { ROLES } from "@/shared/constants/roles.js";
import {
  FULFILLMENT_TYPE,
  WORK_ORDER_STATUS,
} from "@/shared/constants/work-order-status.js";
import { User } from "@/modules/users/user.model.js";
import { Vendor } from "@/modules/vendors/vendor.model.js";
import { WorkOrder } from "@/modules/work-orders/work-order.model.js";
import type { CreateVendorApplicationInput } from "./vendor-application.schema.js";
import { VendorApplicationRepository } from "./vendor-application.repository.js";

type Actor = {
  userId: string;
  role: string;
};

const applicantRoles: string[] = [ROLES.VENDOR_LEAD, ROLES.VENDOR_MANAGER];

export class VendorApplicationService {
  private repository = new VendorApplicationRepository();

  async create(data: CreateVendorApplicationInput, actor: Actor) {
    if (!applicantRoles.includes(actor.role)) {
      throw new AppError("Only vendor lead or vendor manager can apply", 403);
    }

    const user = await User.findById(actor.userId).select("vendorId");

    if (!user?.vendorId) {
      throw new AppError("Vendor user is not attached to a vendor", 403);
    }

    const vendor = await Vendor.findById(user.vendorId).select(
      "serviceCategories serviceAreas status",
    );

    if (!vendor || vendor.status !== "active") {
      throw new AppError("Vendor is not active", 403);
    }

    const workOrder = await WorkOrder.findById(data.workOrderId);

    if (!workOrder) {
      throw new AppError("Work order not found", 404);
    }

    if (
      workOrder.fulfillmentType !== FULFILLMENT_TYPE.MARKETPLACE ||
      workOrder.status !== WORK_ORDER_STATUS.OPEN ||
      workOrder.assignedVendorId
    ) {
      throw new AppError(
        "Only open marketplace work orders accept applications",
        400,
      );
    }

    if (!vendor.serviceCategories.includes(workOrder.serviceCategory)) {
      throw new AppError("Vendor does not service this category", 403);
    }

    if (
      vendor.serviceAreas.length > 0 &&
      !vendor.serviceAreas.some((areaId) => areaId.equals(workOrder.facilityId))
    ) {
      throw new AppError("Work order is outside vendor service areas", 403);
    }

    const existing = await this.repository.findOne(
      data.workOrderId,
      user.vendorId.toString(),
    );

    if (existing) {
      throw new AppError("Vendor has already applied to this work order", 409);
    }

    const application: Record<string, unknown> = {
      workOrderId: new Types.ObjectId(data.workOrderId),
      vendorId: user.vendorId,
      appliedBy: new Types.ObjectId(actor.userId),
      status: "submitted",
    };

    if (data.note) {
      application.note = data.note;
    }

    return this.repository.create(application);
  }

  listByWorkOrder(workOrderId: string) {
    return this.repository.findByWorkOrder(workOrderId);
  }
}
