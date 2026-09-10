import { ContractAward } from "./contract-award.model.js";
import { ContractAwardWorkOrder } from "./contract-award-work-order.model.js";
import type { ClientSession } from "mongoose";

export class ContractAwardRepository {
  async create(data: Record<string, unknown>, session?: ClientSession) {
    const records = await ContractAward.create([data], session ? { session } : undefined);
    return records[0];
  }

  findByWorkOrder(workOrderId: string) {
    return ContractAward.findOne({ workOrderId });
  }
  findById(id: string) { return ContractAward.findById(id); }
  findByOrganization(organizationId: string) { return ContractAward.find({ organizationId }).sort({ createdAt: -1 }).limit(100); }
  findByVendor(vendorId: string) { return ContractAward.find({ vendorId }).sort({ createdAt: -1 }).limit(100); }
  update(id: string, data: Record<string, unknown>) { return ContractAward.findByIdAndUpdate(id, data, { new: true }); }
  addWorkOrder(data: Record<string, unknown>) { return ContractAwardWorkOrder.create(data); }
  listWorkOrders(awardId: string) { return ContractAwardWorkOrder.find({ contractAwardId: awardId, removedAt: { $exists: false } }).sort({ associatedAt: 1 }).limit(100); }
  findWorkOrder(awardId: string, workOrderId: string) { return ContractAwardWorkOrder.findOne({ contractAwardId: awardId, workOrderId }); }
  removeWorkOrder(awardId: string, workOrderId: string) { return ContractAwardWorkOrder.findOneAndUpdate({ contractAwardId: awardId, workOrderId, removedAt: { $exists: false } }, { removedAt: new Date() }, { new: true }); }
}
