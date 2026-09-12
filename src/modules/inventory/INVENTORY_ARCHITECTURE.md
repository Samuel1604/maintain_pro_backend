# Inventory Module Architecture

## 1. Purpose

Inventory owns stock items, storage locations, balances, reservations, movements, reorder thresholds, and immutable stock transactions used by maintenance operations.

## 2. Folder map

- Item and location routes/controllers expose catalog and storage operations.
- Schemas/types validate quantities, units, categories, thresholds, and movement reasons.
- Services enforce organization scope, reservation rules, and non-negative balances.
- Repositories/models persist items, balances, reservations, and transactions.
- Event services publish stock changes and low-stock notifications.

## 3. Stock flow

1. A request identifies an item and storage location.
2. The service verifies organization ownership and available quantity.
3. A receipt, issue, reservation, release, transfer, return, or adjustment updates the balance atomically.
4. An immutable transaction records who performed the operation and why.
5. Low-stock thresholds publish a notification event when crossed.

Reservations must not reduce stock twice, and consumption must reference a valid issue or reservation where required. A transaction is the audit trail; balances are the fast operational view.

## 4. Concurrency and failure

Balance updates should use atomic conditions to prevent negative stock under concurrent requests. Duplicate movement requests require an idempotency key. Temporary database failures may retry; invalid quantities, missing items, and insufficient stock do not.

## 5. Permissions and boundaries

Inventory is tenant-scoped. Facility and storage-location checks must happen before reading or mutating balances. Work orders may request or consume stock, but inventory owns the quantity decision.

## 6. Testing expectations

Test atomic reservation, release, issue, consumption, transfer, return, adjustment, duplicate idempotency keys, negative-stock prevention, tenant isolation, low-stock events, and transaction history.

## 7. Trade-offs and future work

Centralized reservation logic protects consistency but can serialize high-contention items. Future work includes reconciliation jobs, barcode integrations, cycle counts, and reporting read models.
