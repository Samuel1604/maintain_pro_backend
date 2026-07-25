import { Types } from "mongoose";
import { AppError } from "@/shared/errors/AppError.js";
import { ROLES } from "@/shared/constants/roles.js";
import { User } from "@/modules/users/user.model.js";
import { VendorApplication } from "@/modules/vendor-applications/vendor-application.model.js";
import { SlaAgreementRepository } from "./sla-agreement.repository.js";
import type { CreateSlaAgreementInput } from "./sla-agreement.schema.js";

type Actor = {
  userId: string;
  role: string;
};

const participantRoles: string[] = [
  ROLES.ADMIN,
  ROLES.FACILITY_MANAGER,
  ROLES.VENDOR_LEAD,
  ROLES.VENDOR_MANAGER,
];

export class SlaAgreementService {
  private repository = new SlaAgreementRepository();

  async create(data: CreateSlaAgreementInput, actor: Actor) {
    if (!participantRoles.includes(actor.role)) {
      throw new AppError("This role cannot create SLA agreements", 403);
    }

    const application = await VendorApplication.findById(
      data.vendorApplicationId,
    );

    if (!application) {
      throw new AppError("Vendor application not found", 404);
    }

    if (
      actor.role === ROLES.VENDOR_LEAD ||
      actor.role === ROLES.VENDOR_MANAGER
    ) {
      const user = await User.findById(actor.userId).select("vendorId");

      if (!user?.vendorId || !application.vendorId.equals(user.vendorId)) {
        throw new AppError("Vendor cannot manage this SLA", 403);
      }
    }

    const agreement: Record<string, unknown> = {
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

    return this.repository.create(agreement);
  }

  listByApplication(vendorApplicationId: string) {
    return this.repository.findByApplication(vendorApplicationId);
  }
}
