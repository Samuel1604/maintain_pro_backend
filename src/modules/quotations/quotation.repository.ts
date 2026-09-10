import { Quotation } from "./quotation.model.js";
import { QuotationRevision } from "./quotation-revision.model.js";

export class QuotationRepository {
  create(data: Record<string, unknown>) {
    return Quotation.create(data);
  }

  findByApplication(vendorApplicationId: string) {
    return Quotation.find({ vendorApplicationId }).sort({ createdAt: -1 }).limit(100);
  }
  findByVendor(vendorId: string) { return Quotation.find({ vendorId }).sort({ createdAt: -1 }).limit(100); }
  findByOrganization(organizationId: string) { return Quotation.find({ organizationId }).sort({ createdAt: -1 }).limit(100); }

  findById(id: string) { return Quotation.findById(id); }
  update(id: string, data: Record<string, unknown>) { return Quotation.findByIdAndUpdate(id, data, { new: true }); }
  createRevision(data: Record<string, unknown>) { return QuotationRevision.create(data); }
  findRevisions(quotationId: string) { return QuotationRevision.find({ quotationId }).sort({ revision: -1 }).limit(100); }
}
