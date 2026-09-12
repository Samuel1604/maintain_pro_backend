export interface ReportPeriodDto { startDate: string; endDate: string }
export interface MaintenanceSummaryDto extends ReportPeriodDto { totalWorkOrders: number; completedWorkOrders: number; openWorkOrders: number; overdueWorkOrders: number; completionRate: number; byPriority: Record<string, number>; byStatus: Record<string, number> }
export interface TrendPointDto { period: string; created: number; completed: number }
export interface WorkOrderReportRowDto { id: string; title: string; status: string; priority: string; serviceCategory: string; facilityId: string; locationId?: string; assetId?: string; createdAt: string; dueDate?: string; completedAt?: string }
export interface PaginatedReportDto<T> { items: T[]; page: number; pageSize: number; total: number; totalPages: number; nextCursor?: string; hasMore?: boolean }
export interface InventoryReportDto { itemId: string; stockLocationId: string; type: string; quantity: number; workOrderId?: string; createdAt: string }
export interface PreventiveMaintenanceReportDto { total: number; approved: number; pendingApproval: number; rejected: number; generatedWorkOrders: number; completed: number; completionRate: number; overdue: null }
export interface SlaComplianceVendorDto { vendorId: string; vendorName: string; agreements: number; completed: number; compliant: number; breaches: number; complianceRate: number }
export interface SlaComplianceReportDto { totalAgreements: number; activeAgreements: number; completedWorkOrders: number; compliantWorkOrders: number; breaches: number; complianceRate: number; vendors: SlaComplianceVendorDto[] }
export interface VendorPerformanceRowDto { vendorId: string; vendorName: string; averageRating: number; assignedWorkOrders: number; completedWorkOrders: number; onTimeWorkOrders: number; completionRate: number; onTimeRate: number }
export interface VendorPerformanceReportDto { totalVendors: number; assignedWorkOrders: number; completedWorkOrders: number; completionRate: number; vendors: VendorPerformanceRowDto[] }
