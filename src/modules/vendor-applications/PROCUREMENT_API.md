# Marketplace Procurement Contracts

The procurement boundary remains separate from Work Orders and SaaS billing:

`VendorApplication -> Quotation / SlaAgreement -> ContractAward -> WorkOrder`

## State transitions

- Vendor applications: `submitted -> under_review -> awarded|rejected`; vendors may withdraw before award.
- Quotations: `submitted -> under_review -> accepted|rejected`; vendors may withdraw while editable.
- SLAs: `draft -> proposed -> accepted -> active -> terminated` (or rejected before acceptance).
- Awards: `pending_approval -> awarded -> active -> completed|terminated`; cancellation is allowed before activation.

## Tenant boundaries

Applications, quotations, SLAs and awards carry `organizationId`. The value is derived from the source Work Order and is never accepted from a vendor request body. Vendor users are restricted to their Vendor membership; organization procurement actions require `admin` or `facility_manager` membership in the source organization.

## API routes

- `POST /api/v1/vendor-applications`
- `GET /api/v1/vendor-applications/mine`
- `GET /api/v1/vendor-applications/work-orders/:workOrderId`
- `PATCH /api/v1/vendor-applications/:id/status`
- `POST /api/v1/vendor-applications/:id/withdraw`
- `POST /api/v1/quotations`
- `GET /api/v1/quotations/applications/:vendorApplicationId`
- `PATCH /api/v1/quotations/:id/status`
- `POST /api/v1/sla-agreements`
- `GET /api/v1/sla-agreements/applications/:vendorApplicationId`
- `PATCH /api/v1/sla-agreements/:id/status`
- `POST /api/v1/contract-awards`
- `GET /api/v1/contract-awards`
- `PATCH /api/v1/contract-awards/:id/status`

## Financial handling

Quotation records retain the existing labor/material inputs for compatibility and also store `subtotalMinor`, `taxAndFeesMinor`, `totalMinor`, and `currency`. New financial calculations must use integer minor units. SaaS billing entities are not reused.

## Migration notes

Existing application, quotation, SLA and award records created before these fields became required need a one-time migration. Backfill `organizationId` from the referenced Work Order, generate quotation references, and populate currency/minor totals before enabling validation in production. Historical records must not be rewritten into new lifecycle states without an explicit migration decision.

## Intentional dependencies

Notifications and audit events reuse the existing event architecture but dedicated procurement event payloads are not yet published by these services. Multi-Work-Order engagements and quotation revision snapshots remain future extensions; the current award remains one award per Work Order.
