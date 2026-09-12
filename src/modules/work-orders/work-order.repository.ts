import { WorkOrder } from "./work-order.model.js";
import type { IWorkOrder } from "./work-order.model.js";
import type { ClientSession } from "mongoose";

export class WorkOrderRepository {
  async create(data: Partial<IWorkOrder>, session?: ClientSession) {
    if (session) {
      const [created] = await WorkOrder.create([data], { session });
      if (!created) throw new Error("Work order was not created");
      return created;
    }
    return WorkOrder.create(data);
  }

  findById(id: string) {
    return WorkOrder.findById(id);
  }

  findOneByOrganization(id: string, organizationId: string) {
    return WorkOrder.findOne({ _id: id, organizationId });
  }

  findPage(filter: Record<string, unknown>, skip: number, limit: number) {
    return WorkOrder.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit);
  }

  findCursorPage(filter: Record<string, unknown>, cursor: { createdAt: Date; id: string } | undefined, limit: number) {
    const cursorFilter = cursor ? { ...filter, $or: [{ createdAt: { $lt: cursor.createdAt } }, { createdAt: cursor.createdAt, _id: { $lt: cursor.id } }] } : filter;
    return WorkOrder.find(cursorFilter).sort({ createdAt: -1, _id: -1 }).limit(limit + 1).lean();
  }

  count(filter: Record<string, unknown>) {
    return WorkOrder.countDocuments(filter);
  }

  findByServiceRequestId(serviceRequestId: string) {
    return WorkOrder.findOne({ serviceRequestId });
  }

  findOpenMarketplace(query: Record<string, unknown>) {
    return WorkOrder.find(query).sort({ createdAt: -1 }).limit(100);
  }
}
