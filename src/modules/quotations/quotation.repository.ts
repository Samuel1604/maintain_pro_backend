import { Quotation } from "./quotation.model.js";

export class QuotationRepository {
  create(data: Record<string, unknown>) {
    return Quotation.create(data);
  }

  findByApplication(vendorApplicationId: string) {
    return Quotation.find({ vendorApplicationId }).sort({ createdAt: -1 });
  }
}
