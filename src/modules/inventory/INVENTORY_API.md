# Inventory Domain Contract

Inventory is an organization-scoped stock domain, separate from Assets. The domain intentionally contains exactly six models: `InventoryCategory`, `InventoryItem`, `StockLocation`, `StockBalance`, `InventoryTransaction`, and `InventoryReservation`. An `InventoryItem` is a stocked product definition; a `StockLocation` is a storage location; a `StockBalance` is the operational quantity for an item/location pair; `InventoryTransaction` is the immutable history; and `InventoryReservation` owns reservation identity, lifecycle, Work Order association, and partial-consumption state.

## Routes

- `GET /api/v1/inventory/items?search=`
- `POST /api/v1/inventory/items`
- `PATCH /api/v1/inventory/items/:id`
- `POST /api/v1/inventory/items/:id/deactivate`
- `GET|POST /api/v1/inventory/categories`
- `GET /api/v1/inventory/locations`
- `POST /api/v1/inventory/locations`
- `PATCH /api/v1/inventory/locations/:id`
- `POST /api/v1/inventory/locations/:id/deactivate`
- `GET /api/v1/inventory/balances?itemId=&stockLocationId=`
- `GET /api/v1/inventory/history?itemId=&stockLocationId=&workOrderId=`
- `POST /api/v1/inventory/transactions/receive`
- `POST /api/v1/inventory/transactions/reserve`
- `POST /api/v1/inventory/transactions/release`
- `POST /api/v1/inventory/transactions/issue`
- `POST /api/v1/inventory/transactions/consume`
- `POST /api/v1/inventory/transactions/return`
- `POST /api/v1/inventory/transactions/adjust`
- `POST /api/v1/inventory/transactions/transfer`

## State and consistency

Reservations are `reserved -> consumed|released`, with `requested -> rejected` supported by the model. Consumption requires an active reservation or a prior Issue transaction, supports partial quantities, and records remaining quantity. Balance reservations and issues use conditional MongoDB updates against available quantity, preventing two concurrent requests from reserving the same units. Transfers use a localized MongoDB session transaction because they mutate two balances and create one history record. Single-balance operations retain the existing conditional-update pattern; deployment must provide the transaction capability required by transfers.

Issue removes stock from a StockLocation for operational use. Consume records actual maintenance use and must reference a reservation or Issue; it does not silently reuse the Issue operation. Returns reference the original Issue/Consumption and are bounded by issued quantity less prior returns/consumption.

Work Orders are references only. Inventory consumption is explicit and is never triggered by Work Order completion. Vendor users do not receive Organization inventory permissions.

## Authorization

Organization Admin and Facility Manager roles manage item definitions, categories, stock locations and adjustments. Admin, Facility Manager and internal Technicians may perform operational stock transactions. Finance and Staff have read access. Vendor roles have no Inventory routes.

## Audit and notifications

Inventory uses the existing `AuditLogService` and `NotificationPolicyService`. Item/location changes and all stock transactions emit immutable audit records. Low-stock notifications target active Organization Admin and Facility Manager users and use an idempotency key per item/recipient.

## Idempotency

Stock-changing request DTOs accept an `idempotencyKey`, persisted on `InventoryTransaction` with a unique sparse index. Replayed receipt, reservation, issue, and consumption requests resolve the existing operation rather than applying it twice. The same key contract is available to the remaining stock-operation handlers as they are adopted by clients.

## Migration

Inventory had no existing persistence implementation in this repository, so there is no historical Inventory data to fabricate or migrate. Future opening balances must be entered through a receipt or explicit adjustment transaction marked with an opening-balance reference. No purchase, payment, vendor-stock, or asset migration is performed.

## Financial boundary

The current Inventory contract stores no authoritative monetary values and performs no payment or purchasing operation. Unit cost/valuation can later reuse the Procurement money abstraction without changing stock transaction identity.
