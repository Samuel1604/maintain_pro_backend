import { requestHandler } from "@/shared/utils/request.js";
import type { AuthRequest } from "@/shared/types/request.js";
import { reportQuerySchema } from "./report.schema.js";
import { ReportService } from "./report.service.js";

const service = new ReportService();
const query = (request: AuthRequest) => reportQuerySchema.parse(request.query);
export const maintenanceSummary = requestHandler<AuthRequest>(async (req, res) => res.ok(await service.summary(query(req), req.user), "Maintenance summary retrieved"));
export const dashboard = requestHandler<AuthRequest>(async (req, res) => res.ok(await service.dashboard(query(req), req.user), "Dashboard data retrieved"));
export const maintenanceTrends = requestHandler<AuthRequest>(async (req, res) => res.ok(await service.trends(query(req), req.user), "Maintenance trends retrieved"));
export const workOrders = requestHandler<AuthRequest>(async (req, res) => res.ok(await service.workOrders(query(req), req.user), "Work Order report retrieved"));
export const inventory = requestHandler<AuthRequest>(async (req, res) => res.ok(await service.inventory(query(req), req.user), "Inventory report retrieved"));
export const preventiveMaintenance = requestHandler<AuthRequest>(async (req, res) => res.ok(await service.preventiveMaintenance(query(req), req.user), "Preventive Maintenance report retrieved"));
export const slaCompliance = requestHandler<AuthRequest>(async (req, res) => res.ok(await service.slaCompliance(query(req), req.user), "SLA compliance report retrieved"));
export const vendorPerformance = requestHandler<AuthRequest>(async (req, res) => res.ok(await service.vendorPerformance(query(req), req.user), "Vendor performance report retrieved"));
