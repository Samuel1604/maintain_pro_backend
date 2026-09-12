# Notifications Contract

Notifications are recipient-scoped communication records. They are created by notification policies reacting to domain events and are separate from audit records and delivery providers.

## API

- `GET /api/v1/notifications?page=1&limit=20&unread=true&type=inventory&priority=high`
- `GET /api/v1/notifications/unread-count`
- `POST /api/v1/notifications/:id/read`
- `POST /api/v1/notifications/read-all`

The authenticated user is always the recipient. `recipientId` is never accepted from the client. Listing is bounded to 100 records per page and supports unread, type and priority filters. Read operations only affect the authenticated recipient's records.

## Model

Each notification stores its recipient, optional organization/vendor/facility scope, typed category, message, priority, read state, resource reference, source idempotency key and timestamps. Multiple recipients receive independent records and independent read state.

## Idempotency and delivery

Notification creation accepts an idempotency key. Existing records with the same key are returned instead of creating duplicates. Push delivery uses the existing provider abstraction. Email/SMS delivery remains an infrastructure follow-up; notification persistence is not rolled back by a secondary delivery failure.

## Implemented policies

- `LowStockDetected` notifies active organization Admin and Facility Manager users with one idempotent record per item and recipient.
- `ProcurementNotificationRequested` resolves active organization Admin/Facility Manager or vendor Lead/Manager recipients according to the event audience.

Other domain events remain reserved until their publishers expose stable payloads and recipient rules. No frontend-only notification records are authoritative.

## Frontend dependency

The backend contract is ready for the existing notification UI to consume. The frontend currently contains a local-storage seeded notification implementation; replacing that source with these endpoints requires write access to the frontend workspace and should preserve the existing presentation components.
