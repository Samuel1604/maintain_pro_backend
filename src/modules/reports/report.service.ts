import { WorkOrder } from "@/modules/work-orders/work-order.model.js";
import { InventoryTransaction } from "@/modules/inventory/inventory-transaction.model.js";
import { PMOccurrence } from "@/modules/preventive-maintenance/pm-occurrence.model.js";
import { SlaAgreement } from "@/modules/sla-agreements/sla-agreement.model.js";
import { Vendor } from "@/modules/vendors/vendor.model.js";
import { ServiceRequest } from "@/modules/service-requests/request.model.js";
import { AuthorizationException } from "@/shared/errors/index.js";
import type { ReportQuery } from "./report.schema.js";
import type { MaintenanceSummaryDto, PaginatedReportDto, TrendPointDto, WorkOrderReportRowDto, InventoryReportDto, PreventiveMaintenanceReportDto, SlaComplianceReportDto, VendorPerformanceReportDto } from "./report.dto.js";
import { RedisCache } from "@/infrastructure/cache/redis.cache.js";
import { cacheKeys, cacheTtlSeconds } from "@/infrastructure/cache/cache-keys.js";
import { cacheHash } from "@/shared/utils/cache-hash.js";

export interface ReportActor { userId: string; role: string; organizationId?: string; vendorId?: string }

export type DashboardResponse = {
  summary: unknown;
  trends: unknown[];
};

export class ReportService {
  private cache = new RedisCache();
  private organization(actor: ReportActor): string {
    if (!actor.organizationId || ["vendor_lead", "vendor_manager", "vendor_technician"].includes(actor.role)) throw new AuthorizationException("Organization reporting access is required");
    return actor.organizationId;
  }

  private filter(organizationId: string, query: ReportQuery): Record<string, unknown> {
    return { organizationId, createdAt: { $gte: query.startDate, $lte: query.endDate }, ...(query.facilityId ? { facilityId: query.facilityId } : {}), ...(query.locationId ? { locationId: query.locationId } : {}), ...(query.assetId ? { assetId: query.assetId } : {}), ...(query.status ? { status: query.status } : {}), ...(query.priority ? { priority: query.priority } : {}), ...(query.serviceCategory ? { serviceCategory: query.serviceCategory } : {}), ...(query.technicianId ? { assignedTechnicianId: query.technicianId } : {}), ...(query.vendorId ? { assignedVendorId: query.vendorId } : {}) };
  }

  async summary(query: ReportQuery, actor: ReportActor): Promise<MaintenanceSummaryDto> {
    const organizationId = this.organization(actor);
    const [totalWorkOrders, completedWorkOrders, byPriority, byStatus, overdueWorkOrders] = await Promise.all([
      WorkOrder.countDocuments(this.filter(organizationId, query)),
      WorkOrder.countDocuments({ ...this.filter(organizationId, query), status: "completed" }),
      WorkOrder.aggregate([{ $match: this.filter(organizationId, query) }, { $group: { _id: "$priority", count: { $sum: 1 } } }]),
      WorkOrder.aggregate([{ $match: this.filter(organizationId, query) }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
      WorkOrder.countDocuments({ ...this.filter(organizationId, query), dueDate: { $lt: new Date() }, status: { $nin: ["completed", "cancelled", "rejected"] } } as Record<string, unknown>),
    ]);
    return { startDate: query.startDate.toISOString(), endDate: query.endDate.toISOString(), totalWorkOrders, completedWorkOrders, openWorkOrders: totalWorkOrders - completedWorkOrders, overdueWorkOrders, completionRate: totalWorkOrders ? Number(((completedWorkOrders / totalWorkOrders) * 100).toFixed(2)) : 0, byPriority: Object.fromEntries(byPriority.map((row: { _id: string; count: number }) => [row._id, row.count])), byStatus: Object.fromEntries(byStatus.map((row: { _id: string; count: number }) => [row._id, row.count])) };
  }

  /** Role-scoped dashboard read model. Keeps dashboard aggregation behind the
   * existing report authorization and organization filter. */
  async dashboard(query: ReportQuery, actor: ReportActor): Promise<DashboardResponse> {
    const scope = actor.organizationId ?? actor.vendorId ?? actor.userId;
    const key = cacheKeys.dashboard(scope, cacheHash({ actor: actor.role, user: actor.userId, query }));
    const cached = await this.cache.get<unknown>(key);
    if (cached) return cached as DashboardResponse;
    if (["technician", "vendor_lead", "vendor_manager", "vendor_technician"].includes(actor.role)) {
      if (actor.role === "technician" && !actor.organizationId) throw new AuthorizationException("Organization reporting access is required");
      if (actor.role !== "technician" && !actor.vendorId) throw new AuthorizationException("Vendor reporting context is required");
      const dateFilter = query.startDate && query.endDate ? { createdAt: { $gte: query.startDate, $lte: query.endDate } } : {};
      const filter: Record<string, unknown> = actor.role === "technician"
        ? { ...dateFilter, organizationId: actor.organizationId, assignedTechnicianId: actor.userId }
        : actor.role === "vendor_technician"
          ? { ...dateFilter, assignedVendorTechnicianId: actor.userId }
          : { ...dateFilter, assignedVendorId: actor.vendorId };
      const [total, completed, open] = await Promise.all([WorkOrder.countDocuments(filter), WorkOrder.countDocuments({ ...filter, status: "completed" }), WorkOrder.countDocuments({ ...filter, status: { $nin: ["completed", "cancelled"] } })]);
      const result = { summary: { totalWorkOrders: total, completedWorkOrders: completed, openWorkOrders: open }, trends: [] }; await this.cache.set(key, result, cacheTtlSeconds.dashboard); return result;
    }
    if (actor.role === "staff") {
      const filter = { organizationId: actor.organizationId, requestedBy: actor.userId, ...(query.startDate && query.endDate ? { createdAt: { $gte: query.startDate, $lte: query.endDate } } : {}) };
      const [total, pending, approved] = await Promise.all([ServiceRequest.countDocuments(filter), ServiceRequest.countDocuments({ ...filter, status: "pending" }), ServiceRequest.countDocuments({ ...filter, status: "approved" })]);
      const result = { summary: { totalServiceRequests: total, pendingServiceRequests: pending, approvedServiceRequests: approved }, trends: [] }; await this.cache.set(key, result, cacheTtlSeconds.dashboard); return result;
    }
    const [summary, trends] = await Promise.all([this.summary(query, actor), this.trends(query, actor)]);
    const result = { summary, trends }; await this.cache.set(key, result, cacheTtlSeconds.dashboard); return result;
  }

  async trends(query: ReportQuery, actor: ReportActor): Promise<TrendPointDto[]> {
    const organizationId = this.organization(actor);
    const rows = await WorkOrder.aggregate([{ $match: { organizationId, $or: [{ createdAt: { $gte: query.startDate, $lte: query.endDate } }, { completedAt: { $gte: query.startDate, $lte: query.endDate } }], ...(query.facilityId ? { facilityId: query.facilityId } : {}), ...(query.locationId ? { locationId: query.locationId } : {}), ...(query.assetId ? { assetId: query.assetId } : {}), ...(query.priority ? { priority: query.priority } : {}), ...(query.serviceCategory ? { serviceCategory: query.serviceCategory } : {}) } }, { $facet: { created: [{ $match: { createdAt: { $gte: query.startDate, $lte: query.endDate } } }, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } }], completed: [{ $match: { completedAt: { $gte: query.startDate, $lte: query.endDate } } }, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$completedAt" } }, count: { $sum: 1 } } }] } }]);
    const points = new Map<string, TrendPointDto>(); for (const row of rows[0]?.created ?? []) points.set(row._id, { period: row._id, created: row.count, completed: 0 }); for (const row of rows[0]?.completed ?? []) points.set(row._id, { period: row._id, created: points.get(row._id)?.created ?? 0, completed: row.count }); return [...points.values()].sort((a, b) => a.period.localeCompare(b.period));
  }

  async workOrders(query: ReportQuery, actor: ReportActor): Promise<PaginatedReportDto<WorkOrderReportRowDto>> {
    const organizationId = this.organization(actor); const filter = this.filter(organizationId, query); const skip = (query.page - 1) * query.pageSize; const sort = { [query.sortBy]: query.sortOrder === "asc" ? 1 : -1 } as Record<string, 1 | -1>;
    const cursor = query.cursor ? JSON.parse(Buffer.from(query.cursor, "base64url").toString("utf8")) as { createdAt: string; id: string } : undefined;
    if (cursor && query.sortBy === "createdAt") filter.createdAt = query.sortOrder === "asc" ? { $gt: new Date(cursor.createdAt) } : { $lt: new Date(cursor.createdAt) };
    const [rows, total] = await Promise.all([WorkOrder.find(filter).sort(sort).skip(cursor ? 0 : skip).limit(query.pageSize + (cursor ? 1 : 0)).lean(), WorkOrder.countDocuments(this.filter(organizationId, query))]);
    const hasMore = Boolean(cursor && rows.length > query.pageSize); const items = hasMore ? rows.slice(0, query.pageSize) : rows; const last = items[items.length - 1]; const nextCursor = hasMore && last ? Buffer.from(JSON.stringify({ createdAt: last.createdAt, id: last._id })).toString("base64url") : undefined;
    return { items: items.map((item) => ({ id: item._id.toString(), title: item.title, status: item.status, priority: item.priority, serviceCategory: item.serviceCategory, facilityId: item.facilityId.toString(), locationId: item.locationId?.toString(), assetId: item.assetId?.toString(), createdAt: item.createdAt.toISOString(), dueDate: item.dueDate?.toISOString(), completedAt: item.completedAt?.toISOString() })), page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize), ...(query.cursor ? { nextCursor, hasMore } : {}) };
  }

  async inventory(query: ReportQuery, actor: ReportActor): Promise<PaginatedReportDto<InventoryReportDto>> {
    const organizationId = this.organization(actor); const filter = { organizationId, createdAt: { $gte: query.startDate, $lte: query.endDate }, ...(query.assetId ? {} : {}) }; const skip = (query.page - 1) * query.pageSize;
    const [items, total] = await Promise.all([InventoryTransaction.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.pageSize).lean(), InventoryTransaction.countDocuments(filter)]);
    return { items: items.map((item) => ({ itemId: item.itemId.toString(), stockLocationId: item.stockLocationId.toString(), type: item.type, quantity: item.quantity, workOrderId: item.workOrderId?.toString(), createdAt: item.createdAt.toISOString() })), page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) };
  }

  async preventiveMaintenance(query: ReportQuery, actor: ReportActor): Promise<PreventiveMaintenanceReportDto> {
    const organizationId = this.organization(actor);
    const occurrenceFilter = { organizationId, scheduledAt: { $gte: query.startDate, $lte: query.endDate }, ...(query.facilityId ? { facilityId: query.facilityId } : {}), ...(query.locationId ? { locationId: query.locationId } : {}), ...(query.assetId ? { assetId: query.assetId } : {}) };
    const [total, approved, pendingApproval, rejected, generatedWorkOrders, completed] = await Promise.all([PMOccurrence.countDocuments(occurrenceFilter), PMOccurrence.countDocuments({ ...occurrenceFilter, approvalState: "approved" }), PMOccurrence.countDocuments({ ...occurrenceFilter, approvalState: "pending_approval" }), PMOccurrence.countDocuments({ ...occurrenceFilter, approvalState: "rejected" }), PMOccurrence.countDocuments({ ...occurrenceFilter, workOrderId: { $exists: true } }), PMOccurrence.countDocuments({ ...occurrenceFilter, status: "completed" })]);
    return { total, approved, pendingApproval, rejected, generatedWorkOrders, completed, completionRate: total ? Number(((completed / total) * 100).toFixed(2)) : 0, overdue: null };
  }

  async slaCompliance(query: ReportQuery, actor: ReportActor): Promise<SlaComplianceReportDto> {
    const organizationId = this.organization(actor);
    const agreements = await SlaAgreement.find({ organizationId, createdAt: { $gte: query.startDate, $lte: query.endDate }, ...(query.vendorId ? { vendorId: query.vendorId } : {}) }).lean();
    const workOrderIds = agreements.map((agreement) => agreement.workOrderId);
    const workOrders = await WorkOrder.find({ organizationId, _id: { $in: workOrderIds } }).lean();
    const byWorkOrder = new Map(workOrders.map((workOrder) => [workOrder._id.toString(), workOrder]));
    const vendorIds = [...new Set(agreements.map((agreement) => agreement.vendorId.toString()))];
    const vendors = await Vendor.find({ _id: { $in: vendorIds } }).lean();
    const names = new Map(vendors.map((vendor) => [vendor._id.toString(), vendor.name]));
    const groups = new Map<string, { agreements: number; completed: number; compliant: number; breaches: number }>();
    for (const agreement of agreements) {
      const vendorId = agreement.vendorId.toString(); const group = groups.get(vendorId) ?? { agreements: 0, completed: 0, compliant: 0, breaches: 0 }; group.agreements += 1;
      const workOrder = byWorkOrder.get(agreement.workOrderId.toString());
      if (workOrder?.status === "completed" && workOrder.completedAt) {
        group.completed += 1;
        const deadline = new Date(workOrder.createdAt).getTime() + agreement.resolutionTimeHours * 3_600_000;
        if (workOrder.completedAt.getTime() <= deadline) group.compliant += 1; else group.breaches += 1;
      }
      groups.set(vendorId, group);
    }
    const rows = [...groups.entries()].map(([vendorId, group]) => ({ vendorId, vendorName: names.get(vendorId) ?? "Unknown vendor", ...group, complianceRate: group.completed ? Number(((group.compliant / group.completed) * 100).toFixed(2)) : 0 }));
    const completedWorkOrders = rows.reduce((total, row) => total + row.completed, 0); const compliantWorkOrders = rows.reduce((total, row) => total + row.compliant, 0); const breaches = rows.reduce((total, row) => total + row.breaches, 0);
    return { totalAgreements: agreements.length, activeAgreements: agreements.filter((agreement) => ["accepted", "active"].includes(agreement.status)).length, completedWorkOrders, compliantWorkOrders, breaches, complianceRate: completedWorkOrders ? Number(((compliantWorkOrders / completedWorkOrders) * 100).toFixed(2)) : 0, vendors: rows.sort((a, b) => b.complianceRate - a.complianceRate) };
  }

  async vendorPerformance(query: ReportQuery, actor: ReportActor): Promise<VendorPerformanceReportDto> {
    const organizationId = this.organization(actor);
    const rows = await WorkOrder.aggregate<{
      _id: unknown;
      assignedWorkOrders: number;
      completedWorkOrders: number;
      onTimeWorkOrders: number;
      vendor?: { name?: string; averageRating?: number };
    }>([
      { $match: { ...this.filter(organizationId, query), assignedVendorId: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: "$assignedVendorId",
          assignedWorkOrders: { $sum: 1 },
          completedWorkOrders: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
          onTimeWorkOrders: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$status", "completed"] },
                    {
                      $or: [
                        { $eq: [{ $ifNull: ["$dueDate", null] }, null] },
                        { $lte: ["$completedAt", "$dueDate"] },
                      ],
                    },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $lookup: {
          from: Vendor.collection.name,
          localField: "_id",
          foreignField: "_id",
          as: "vendor",
        },
      },
      { $unwind: { path: "$vendor", preserveNullAndEmptyArrays: true } },
      { $sort: { completedWorkOrders: -1, assignedWorkOrders: -1 } },
    ]);
    const reportRows = rows.map((row) => ({
      vendorId: String(row._id),
      vendorName: row.vendor?.name ?? "Unknown vendor",
      averageRating: row.vendor?.averageRating ?? 0,
      assignedWorkOrders: row.assignedWorkOrders,
      completedWorkOrders: row.completedWorkOrders,
      onTimeWorkOrders: row.onTimeWorkOrders,
      completionRate: row.assignedWorkOrders ? Number(((row.completedWorkOrders / row.assignedWorkOrders) * 100).toFixed(2)) : 0,
      onTimeRate: row.completedWorkOrders ? Number(((row.onTimeWorkOrders / row.completedWorkOrders) * 100).toFixed(2)) : 0,
    }));
    const assignedWorkOrders = reportRows.reduce((total, row) => total + row.assignedWorkOrders, 0); const completedWorkOrders = reportRows.reduce((total, row) => total + row.completedWorkOrders, 0);
    return { totalVendors: reportRows.length, assignedWorkOrders, completedWorkOrders, completionRate: assignedWorkOrders ? Number(((completedWorkOrders / assignedWorkOrders) * 100).toFixed(2)) : 0, vendors: reportRows };
  }
}
