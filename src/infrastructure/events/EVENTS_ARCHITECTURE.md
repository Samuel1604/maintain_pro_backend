# Events Infrastructure Architecture

## 1. Why this folder exists

This folder is MaintainPro's event-driven coordination layer. A domain module publishes a fact after a state change, and other parts of the application react without the original service knowing every consumer.

The event layer is not a replacement for direct service calls. Use a direct call when the caller needs an immediate result or validation response. Use an event when the reaction can be asynchronous, independently retried, or handled by more than one consumer.

## 2. Folder map

### `bus/`

Defines the event envelope and the in-process bus. The bus is responsible for publishing an event to registered listeners; it does not own business rules.

### `dispatcher/`

Finds listeners for an event name and invokes them. It preserves event metadata in logs and must surface listener failures instead of treating them as successful work.

### `listeners/`

Contains cross-cutting reactions such as audit, email, notifications, realtime updates, and queue hand-off. A listener should remain small and delegate domain work to a service.

### `publisher/`

Bridges domain publication to the configured event transport. Queue-backed publication serializes the event envelope so it can survive a process restart.

### `idempotency/`

Stores durable processing state. `eventId` is the primary identity used to protect against duplicate delivery across retries, duplicate enqueueing, and worker restarts.

### `EVENT_CATALOG.md`

Lists supported event names and their payload intent. Add a catalog entry when introducing a new event or changing an event payload.

## 3. Event contract

Every event should carry:

- `eventId`: immutable identity of the domain fact.
- `eventName`: stable name used by listeners and logs.
- `occurredAt`: time at which the fact was created.
- `correlationId`: identity shared by one user/request workflow.
- `causationId`: event or command that caused this event.
- `payload`: business data needed by consumers.
- `version`: payload compatibility version when the event is externally consumed.

Event IDs must not be regenerated when an event moves from the bus to a queue or DLQ. A replay creates a new delivery/job identity but preserves the original event identity.

## 4. Event lifecycle

1. A module changes durable state and creates a domain event.
2. The event bus publishes it with tracing metadata.
3. The dispatcher invokes matching listeners.
4. Synchronous listeners finish in-process.
5. Queue listeners create a job containing the complete event envelope.
6. A worker claims the job, checks durable idempotency, and executes the side effect.
7. Successful processing is marked complete.
8. Retryable failures return to the queue; final failures go to the DLQ with the same tracing chain.

## 5. Listener rules

- Do not put database transactions for unrelated modules inside one listener.
- Do not publish an event simply to hide a required synchronous validation call.
- Do not swallow errors from queue-backed work.
- Keep handlers idempotent; duplicate delivery is expected.
- Never include passwords, tokens, payment credentials, or unnecessary personal data.
- Log `eventId`, `eventName`, `correlationId`, `causationId`, queue, and job ID where available.

Every event envelope also normalizes tenant scope when known: `organizationId`, `facilityId`, and `vendorId`. Producers should provide scope in metadata; the base event supports payload fallback during migration. Facility- and vendor-scoped consumers must validate that scope before reading or mutating data.

## 6. Reliability and consistency

Events create eventual consistency. The original write may succeed while a notification or report update is still pending. User-facing responses must describe the durable operation, not pretend that every reaction is already complete.

Where losing an event would be unacceptable, use an outbox-compatible persistence strategy: write the state change and an event record in the same MongoDB transaction where supported, then publish the outbox record asynchronously.

## 7. External side effects

Email, payment, SMS, and external API calls cannot always be exactly-once because the provider is outside MongoDB. Persist delivery state, use a provider idempotency key when supported, and treat ambiguous timeouts as recoverable until verified.

## 8. Testing expectations

Event tests should verify event shape, stable identifiers, listener registration, duplicate delivery, missing listeners, retry behavior, and DLQ metadata. Provider tests should confirm that sensitive fields are not serialized or logged.

## 9. Trade-offs

The current in-process bus and BullMQ bridge keep the modular monolith simple and observable. The cost is eventual consistency, more operational tracing, and careful duplicate handling. Introducing another broker would increase operational burden without solving domain idempotency by itself.

## 10. Future work

- Add event payload version validation.
- Add transactional outbox support for critical state changes.
- Add listener latency and failure metrics.
- Maintain `EVENT_CATALOG.md` and add catalog validation tests as event families expand.
- Add replay tooling that uses normal authorization and idempotency checks.
