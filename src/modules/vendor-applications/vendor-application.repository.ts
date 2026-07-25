import { VendorApplication } from "./vendor-application.model.js";

export class VendorApplicationRepository {
  create(data: Record<string, unknown>) {
    return VendorApplication.create(data);
  }

  findById(id: string) {
    return VendorApplication.findById(id);
  }

  findByWorkOrder(workOrderId: string) {
    return VendorApplication.find({ workOrderId }).sort({ createdAt: -1 });
  }

  findOne(workOrderId: string, vendorId: string) {
    return VendorApplication.findOne({ workOrderId, vendorId });
  }
}
