import { PMOccurrence } from "./pm-occurrence.model.js";
export class PMOccurrenceRepository {
  create(data: Record<string, unknown>) { return PMOccurrence.create(data); }
  findById(id: string) { return PMOccurrence.findById(id); }
  findByPlan(organizationId: string, preventiveMaintenanceId: string, options: { from?: Date; to?: Date; skip?: number; limit?: number } = {}) {
    const scheduledAt: Record<string, Date> = {};
    if (options.from) scheduledAt.$gte = options.from;
    if (options.to) scheduledAt.$lte = options.to;
    return PMOccurrence.find({ organizationId, preventiveMaintenanceId, ...(Object.keys(scheduledAt).length ? { scheduledAt } : {}) }).sort({ scheduledAt: 1 }).skip(options.skip ?? 0).limit(options.limit ?? 20);
  }
  findByOrganization(organizationId: string, options: { filter?: Record<string, unknown>; sort?: Record<string, 1 | -1>; skip?: number; limit?: number } = {}) {
    return PMOccurrence.find({ organizationId, ...(options.filter ?? {}) }).sort(options.sort ?? { scheduledAt: 1 }).skip(options.skip ?? 0).limit(options.limit ?? 20);
  }
  count(organizationId: string, filter: Record<string, unknown>) { return PMOccurrence.countDocuments({ organizationId, ...filter }); }
  findBySchedule(preventiveMaintenanceId: string, scheduledAt: Date) { return PMOccurrence.findOne({ preventiveMaintenanceId, scheduledAt }); }
  update(id: string, organizationId: string, data: Record<string, unknown>) { return PMOccurrence.findOneAndUpdate({ _id: id, organizationId }, data, { new: true }); }
}
