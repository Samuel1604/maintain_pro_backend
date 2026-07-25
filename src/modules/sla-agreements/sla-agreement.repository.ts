import { SlaAgreement } from "./sla-agreement.model.js";

export class SlaAgreementRepository {
  create(data: Record<string, unknown>) {
    return SlaAgreement.create(data);
  }

  findByApplication(vendorApplicationId: string) {
    return SlaAgreement.find({ vendorApplicationId }).sort({ createdAt: -1 });
  }
}
