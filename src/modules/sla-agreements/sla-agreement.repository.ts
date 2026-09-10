import { SlaAgreement } from "./sla-agreement.model.js";

export class SlaAgreementRepository {
  create(data: Record<string, unknown>) {
    return SlaAgreement.create(data);
  }

  findByApplication(vendorApplicationId: string) {
    return SlaAgreement.find({ vendorApplicationId }).sort({ createdAt: -1 }).limit(100);
  }
  findByVendor(vendorId: string) { return SlaAgreement.find({ vendorId }).sort({ createdAt: -1 }).limit(100); }
  findById(id: string) { return SlaAgreement.findById(id); }
  update(id: string, data: Record<string, unknown>) { return SlaAgreement.findByIdAndUpdate(id, data, { new: true }); }
}
