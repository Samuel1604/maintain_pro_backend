# Preventive Maintenance Contract

## Domain model

`PMPlan` is the reusable maintenance definition. Its optional `recurrence` contains a frequency, interval, UTC start date, optional end date, optional weekdays (`0` Sunday through `6` Saturday), and optional month day. `PMOccurrence` is one scheduled instance and owns the `workOrderId` traceability link.

Existing PM documents remain readable through the legacy PM endpoints. They are treated as single-occurrence plans when `recurrence` is absent. New recurring plans create bounded occurrences for the next 90 days. The unique `(preventiveMaintenanceId, scheduledAt)` index prevents duplicate occurrences.

## Endpoints

- `POST /api/v1/preventive-maintenance` creates a plan and its initial bounded occurrences.
- `GET /api/v1/preventive-maintenance` lists plans with pagination and existing filters.
- `GET /api/v1/preventive-maintenance/:id` retrieves a plan.
- `GET /api/v1/preventive-maintenance/occurrences` lists organization-scoped occurrences with status, asset, facility, location and date filters.
- `GET /api/v1/preventive-maintenance/:id/occurrences` lists occurrences for a plan.
- `POST /api/v1/preventive-maintenance/occurrences/:id/approve` approves one occurrence and generates at most one Work Order.

The existing plan approve/reject routes remain compatible. Plan approval approves the first pending occurrence; later recurring occurrences remain pending until separately approved. Assignment, checklist execution and notification scheduling remain Work Order/infrastructure capabilities and are intentionally outside this contract.

## Assignment ownership

Plans may carry a `defaultAssignment`; occurrences carry the resolved `assignment`. Admin and Facility Manager may assign, reassign, or clear ownership. The current target supported by identity validation is an organization technician (`targetType: "user"`).

The existing Work Order contract accepts `technicianId`, so internal PM assignments create assigned internal Work Orders. Vendor and team assignment are rejected until authorized vendor relationships and a team identity contract exist. No parallel PM execution assignment is created.

## Migration

No destructive migration is required. Existing PM records keep their current fields and responses. A later data migration may create explicit `PMOccurrence` documents for legacy records if historical occurrence queries need to include them; new writes use the separate occurrence collection immediately.
