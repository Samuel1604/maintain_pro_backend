import { Types } from "mongoose";
import { AuthorizationException, NotFoundException, BusinessException, ConflictException } from "@/shared/errors/index.js";
import { ROLES } from "@/shared/constants/roles.js";
import { User } from "@/modules/users/user.model.js";
import { VendorApplication } from "@/modules/vendor-applications/vendor-application.model.js";
import { WorkOrder } from "@/modules/work-orders/work-order.model.js";
import type { CreateQuotationInput, CreateQuotationRevisionInput } from "./quotation.schema.js";
import { QuotationRepository } from "./quotation.repository.js";
import type { ApplicationResult } from "@/shared/application-result/index.js";
import type { IQuotation } from "./quotation.model.js";
import { ProcurementEventsService } from "@/modules/procurement/procurement-events.service.js";

type Actor = {
  userId: string;
  role: string;
  organizationId?: string;
  vendorId?: string;
};

const vendorRoles: string[] = [ROLES.VENDOR_LEAD, ROLES.VENDOR_MANAGER];

export class QuotationService {
  private repository = new QuotationRepository();
  private events = new ProcurementEventsService();

  async create(data: CreateQuotationInput, actor: Actor): Promise<ApplicationResult<IQuotation>> {
    if (!vendorRoles.includes(actor.role)) {
      throw new AuthorizationException(
        "Only vendor lead or vendor manager can submit quotations",
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
      throw new NotFoundException("Vendor application not found for this vendor");
    }

    const workOrder = await WorkOrder.findById(application.workOrderId).select("organizationId");
    if (!workOrder) throw new NotFoundException("Work order not found");
    const subtotalMinor = Math.round((data.laborCost + data.materialCost) * 100);

    const quotation: Record<string, unknown> = {
      organizationId: workOrder.organizationId,
      vendorApplicationId: new Types.ObjectId(data.vendorApplicationId),
      workOrderId: application.workOrderId,
      vendorId: application.vendorId,
      submittedBy: new Types.ObjectId(actor.userId),
      laborCost: data.laborCost,
      materialCost: data.materialCost,
      estimatedDurationHours: data.estimatedDurationHours,
      status: "submitted",
      quotationNumber: `Q-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      currency: "USD",
      subtotalMinor,
      taxAndFeesMinor: 0,
      totalMinor: subtotalMinor,
    };

    if (data.notes) {
      quotation.notes = data.notes;
    }

    const created = await this.repository.create(quotation);
    await this.events.auditEvent({ action: "procurement.quotation_submitted", actorId: actor.userId, organizationId: workOrder.organizationId.toString(), entityId: created._id.toString() });
    await this.events.notifyOrganization(workOrder.organizationId.toString(), actor.userId, created._id.toString(), "Quotation submitted", "A vendor submitted a quotation for review.");

    return {
      success: true,
      message: "Quotation submitted successfully",
      data: created,
    };
  }

  async listByApplication(vendorApplicationId: string, actor: Actor): Promise<ApplicationResult<IQuotation[]>> {
    const application = await VendorApplication.findById(vendorApplicationId);
    if (!application) throw new NotFoundException("Vendor application not found");
    if (actor.organizationId && application.organizationId.toString() !== actor.organizationId) {
      throw new AuthorizationException("Application is outside the organization scope");
    }
    if (actor.vendorId && application.vendorId.toString() !== actor.vendorId) {
      throw new AuthorizationException("Application is outside the vendor scope");
    }
    const quotations = await this.repository.findByApplication(vendorApplicationId);

    return {
      success: true,
      message: "Quotations retrieved successfully",
      data: quotations,
    };
  }

  async listForVendor(actor: Actor): Promise<ApplicationResult<IQuotation[]>> {
    if (!actor.vendorId || !vendorRoles.includes(actor.role)) throw new AuthorizationException("Vendor quotation access required");
    return { success: true, message: "Vendor quotations retrieved successfully", data: await this.repository.findByVendor(actor.vendorId) };
  }

  async listForOrganization(actor: Actor): Promise<ApplicationResult<IQuotation[]>> {
    if (!actor.organizationId || ![ROLES.ADMIN, ROLES.FACILITY_MANAGER, ROLES.FINANCE].includes(actor.role as typeof ROLES.ADMIN)) throw new AuthorizationException("Organization quotation access required");
    return { success: true, message: "Organization quotations retrieved successfully", data: await this.repository.findByOrganization(actor.organizationId) };
  }

  async updateStatus(id: string, status: "under_review" | "accepted" | "rejected" | "withdrawn", actor: Actor): Promise<ApplicationResult<IQuotation>> {
    const quotation = await this.repository.findById(id);
    if (!quotation) throw new NotFoundException("Quotation not found");
    const application = await VendorApplication.findById(quotation.vendorApplicationId);
    if (!application) throw new NotFoundException("Vendor application not found");
    const isOrg = [ROLES.ADMIN, ROLES.FACILITY_MANAGER].includes(actor.role as typeof ROLES.ADMIN);
    if (isOrg && (!actor.organizationId || application.organizationId.toString() !== actor.organizationId)) throw new AuthorizationException("Quotation is outside the organization scope");
    if (!isOrg && (!actor.vendorId || application.vendorId.toString() !== actor.vendorId)) throw new AuthorizationException("Quotation is outside the vendor scope");
    const allowed: Record<string, string[]> = { submitted: ["under_review", "accepted", "rejected"], under_review: ["accepted", "rejected"], draft: ["submitted", "withdrawn"] };
    if (!allowed[quotation.status]?.includes(status)) throw new BusinessException("Invalid quotation status transition");
    const updated = await this.repository.update(id, { status });
    return { success: true, message: "Quotation status updated", data: updated! };
  }

  async revisions(quotationId: string, actor: Actor) {
    const quotation = await this.repository.findById(quotationId);
    if (!quotation) throw new NotFoundException("Quotation not found");
    if (actor.organizationId !== quotation.organizationId.toString() && actor.vendorId !== quotation.vendorId.toString()) throw new AuthorizationException("Quotation access denied");
    return this.repository.findRevisions(quotationId);
  }

  async createRevision(data: CreateQuotationRevisionInput, actor: Actor) {
    const quotation = await this.repository.findById(data.quotationId);
    if (!quotation || !actor.vendorId || quotation.vendorId.toString() !== actor.vendorId) throw new AuthorizationException("Quotation revision access denied");
    if (["accepted", "rejected", "withdrawn", "expired"].includes(quotation.status)) throw new ConflictException("This quotation cannot be revised");
    const revision = quotation.currentRevision + 1;
    const lineItems = data.lineItems.map((item) => ({ ...item, lineTotalMinor: Math.round(item.quantity * item.unitPriceMinor) }));
    const subtotalMinor = lineItems.reduce((sum, item) => sum + item.lineTotalMinor, 0);
    const created = await this.repository.createRevision({ ...data, quotationId: quotation._id, organizationId: quotation.organizationId, vendorApplicationId: quotation.vendorApplicationId, vendorId: quotation.vendorId, submittedBy: new Types.ObjectId(actor.userId), revision, lineItems, subtotalMinor, totalMinor: subtotalMinor + data.taxAndFeesMinor });
    await this.events.auditEvent({ action: "procurement.quotation_revision_created", actorId: actor.userId, organizationId: quotation.organizationId.toString(), entityId: created._id.toString(), metadata: { quotationId: data.quotationId, revision } });
    await this.repository.update(data.quotationId, { currentRevision: revision, currency: data.currency, subtotalMinor, taxAndFeesMinor: data.taxAndFeesMinor, totalMinor: subtotalMinor + data.taxAndFeesMinor, status: "submitted" });
    return created;
  }
}
