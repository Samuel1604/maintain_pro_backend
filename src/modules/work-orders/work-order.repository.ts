import { WorkOrder } from "./work-order.model.js";
import type { IWorkOrder } from "./work-order.model.js";

export class WorkOrderRepository {
  create(data: Partial<IWorkOrder>) {
    return WorkOrder.create(data);
  }

  findById(id: string) {
    return WorkOrder.findById(id);
  }

  findOpenMarketplace(query: Record<string, unknown>) {
    return WorkOrder.find(query).sort({ createdAt: -1 });
  }
}
