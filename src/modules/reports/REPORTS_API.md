# Reports Contract

Reports are organization-scoped, read-only query endpoints. They do not mutate operational domains.

## Implemented endpoints

- `GET /api/v1/reports/maintenance/summary`
- `GET /api/v1/reports/maintenance/trends`
- `GET /api/v1/reports/work-orders`
- `GET /api/v1/reports/inventory`
- `GET /api/v1/reports/preventive-maintenance`
- `GET /api/v1/reports/sla-compliance`
- `GET /api/v1/reports/vendor-performance`

All endpoints require an authenticated Admin, Facility Manager, or Finance user. Queries require `startDate` and `endDate` and support organization-safe facility, location, asset, status, priority, category, pagination, and sorting where applicable.

## Metric definitions

- Completion rate: completed Work Orders divided by Work Orders created in the selected period.
- Open Work Orders: selected-period Work Orders not in `completed` status.
- Trends: created and completed Work Orders are grouped independently using `createdAt` and authoritative `completedAt` timestamps. A Work Order may therefore contribute to different dates.
- Overdue Work: Work Orders with an authoritative `dueDate` before the current time and status not in `completed`, `cancelled`, or `rejected`. Legacy Work Orders without `dueDate` are excluded from overdue counts.
- Inventory report: immutable `InventoryTransaction` records, not mutations or reconstructed history.
- SLA compliance: an SLA-linked Work Order is compliant only when it is `completed`, has an authoritative `completedAt`, and completed within its agreement's `resolutionTimeHours` measured from the Work Order's authoritative `createdAt`. Agreements without a completed Work Order are not counted in the rate.
- Vendor performance: completion rate uses vendor-assigned Work Orders in the selected period; on-time rate uses completed vendor Work Orders with a `dueDate` and authoritative `completedAt`. Completed Work Orders without a due date are treated as on-time because no contractual due-date target exists on that record.

## Intentionally unsupported

Asset downtime, PM overdue status, quotation/award analytics, and exports remain unavailable until stable source timestamps/relationships or an authorized export contract exists. PM summary reporting is implemented using persisted occurrence date, status, completion state, and `workOrderId`. No demo values are returned.
