import { Types } from "mongoose";
import { AppError } from "@/shared/errors/AppError.js";
import { ROLES } from "@/shared/constants/roles.js";
import { User } from "@/modules/users/user.model.js";
import { VendorApplication } from "@/modules/vendor-applications/vendor-application.model.js";
import type { CreateQuotationInput } from "./quotation.schema.js";
import { QuotationRepository } from "./quotation.repository.js";

type Actor = {
  userId: string;
  role: string;
};

const vendorRoles: string[] = [ROLES.VENDOR_LEAD, ROLES.VENDOR_MANAGER];

export class QuotationService {
  private repository = new QuotationRepository();

  async create(data: CreateQuotationInput, actor: Actor) {
    if (!vendorRoles.includes(actor.role)) {
      throw new AppError(
        "Only vendor lead or vendor manager can submit quotations",
        403,
      );
    }

    const user = await User.findById(actor.userId).select("vendorId");
    const application = await VendorApplication.findById(
      data.vendorApplicationId,
    );

    if (
      !user?.vendorId ||
      !application ||
      !application.vendorId.equals(user.vendorId)
    ) {
      throw new AppError("Vendor application not found for this vendor", 404);
    }

    const quotation: Record<string, unknown> = {
      vendorApplicationId: new Types.ObjectId(data.vendorApplicationId),
      workOrderId: application.workOrderId,
      vendorId: application.vendorId,
      submittedBy: new Types.ObjectId(actor.userId),
      laborCost: data.laborCost,
      materialCost: data.materialCost,
      estimatedDurationHours: data.estimatedDurationHours,
      status: "submitted",
    };

    if (data.notes) {
      quotation.notes = data.notes;
    }

    return this.repository.create(quotation);
  }

  listByApplication(vendorApplicationId: string) {
    return this.repository.findByApplication(vendorApplicationId);
  }
}
