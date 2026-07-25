import { Types } from "mongoose";
import { AppError } from "@/shared/errors/AppError.js";
import { ROLES } from "@/shared/constants/roles.js";
import {
  FULFILLMENT_TYPE,
  WORK_ORDER_STATUS,
} from "@/shared/constants/work-order-status.js";
import { User } from "@/modules/users/user.model.js";
import { WorkOrder } from "@/modules/work-orders/work-order.model.js";
import { VendorApplication } from "@/modules/vendor-applications/vendor-application.model.js";
import { ContractAwardRepository } from "./contract-award.repository.js";
import type { CreateContractAwardInput } from "./contract-award.schema.js";

type Actor = {
  userId: string;
  role: string;
};

const managerRoles: string[] = [ROLES.ADMIN, ROLES.FACILITY_MANAGER];

export class ContractAwardService {
  private repository = new ContractAwardRepository();

  async create(data: CreateContractAwardInput, actor: Actor) {
    if (!managerRoles.includes(actor.role)) {
      throw new AppError(
        "Only admin or facility manager can award contracts",
        403,
      );
    }

    const application = await VendorApplication.findById(
      data.vendorApplicationId,
    );

    if (!application) {
      throw new AppError("Vendor application not found", 404);
    }

    const workOrder = await WorkOrder.findById(application.workOrderId);

    if (!workOrder) {
      throw new AppError("Work order not found", 404);
    }

    if (
      workOrder.fulfillmentType !== FULFILLMENT_TYPE.MARKETPLACE ||
      workOrder.status !== WORK_ORDER_STATUS.OPEN
    ) {
      throw new AppError(
        "Only open marketplace work orders can be awarded",
        400,
      );
    }

    const existingAward = await this.repository.findByWorkOrder(workOrder.id);

    if (existingAward) {
      throw new AppError("Work order already has a contract award", 409);
    }

    if (data.assignedVendorTechnicianId) {
      const technician = await User.findById(
        data.assignedVendorTechnicianId,
      ).select("role vendorId");

      if (
        !technician ||
        technician.role !== ROLES.VENDOR_TECHNICIAN ||
        !technician.vendorId?.equals(application.vendorId)
      ) {
        throw new AppError(
          "Assigned worker must be this vendor's technician",
          400,
        );
      }
    }

    const award: Record<string, unknown> = {
      workOrderId: application.workOrderId,
      vendorApplicationId: application._id,
      vendorId: application.vendorId,
      awardedBy: new Types.ObjectId(actor.userId),
      awardedAt: new Date(),
      status: "awarded",
    };

    if (data.quotationId) {
      award.quotationId = new Types.ObjectId(data.quotationId);
    }

    if (data.slaAgreementId) {
      award.slaAgreementId = new Types.ObjectId(data.slaAgreementId);
    }

    if (data.assignedVendorTechnicianId) {
      award.assignedVendorTechnicianId = new Types.ObjectId(
        data.assignedVendorTechnicianId,
      );
      workOrder.assignedVendorTechnicianId =
        award.assignedVendorTechnicianId as Types.ObjectId;
    }

    if (data.notes) {
      award.notes = data.notes;
    }

    workOrder.assignedVendorId = application.vendorId;
    workOrder.status = WORK_ORDER_STATUS.ASSIGNED;
    application.status = "awarded";

    const createdAward = await this.repository.create(award);
    await workOrder.save();
    await application.save();

    return createdAward;
  }
}
