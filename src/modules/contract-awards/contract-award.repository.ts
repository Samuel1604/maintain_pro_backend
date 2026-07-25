import { ContractAward } from "./contract-award.model.js";

export class ContractAwardRepository {
  create(data: Record<string, unknown>) {
    return ContractAward.create(data);
  }

  findByWorkOrder(workOrderId: string) {
    return ContractAward.findOne({ workOrderId });
  }
}
