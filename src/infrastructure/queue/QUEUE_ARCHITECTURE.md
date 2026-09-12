# Queue Infrastructure Architecture

## 1. Why this folder exists

The queue layer runs work outside the HTTP request so it can be retried, delayed, prioritized, and recovered after a process restart. BullMQ and Redis are the production transport; the in-memory driver is for local development and tests.

## 2. Folder map

### Queue contract and registry

The queue job type defines the stable envelope. The registry maps queue/job names to workers and must fail loudly when a worker is unavailable.

### `providers/`

Contains BullMQ and in-memory adapters. Providers own transport details, connection settings, retries, priorities, rate limits, lock behavior, and worker lifecycle.

### `workers/`

Contains asynchronous handlers for email, notifications, audit, reports, billing, marketplace, and other jobs. Workers translate a queue job into a service call.

### Job naming

Queue names describe the transport lane, while job names describe the operation using `<domain>.<action>`. Examples are `domain-event.dispatch`, `identity.login-notification`, and `email.send`. During development, canonical names are used directly; production deployments should keep job names stable once queues contain live work.

### `dead-letter/`

Stores final failures in the dedicated DLQ, preserving the original payload and complete trace metadata for investigation and replay.

### Queue configuration

Queue names, retry defaults, concurrency, lock settings, and provider limits belong in validated configuration rather than scattered constants.

## 3. Queue job contract

Jobs should preserve:

- `jobId`: delivery identity assigned by the queue.
- `eventId`: original domain-event identity when the job came from an event.
- `eventName`: stable event name for logs and operations.
- `correlationId`: end-to-end workflow identity.
- `causationId`: event or command that caused the work.
- `queue` and `name`: operational routing identity.
- `priority`: BullMQ priority where a policy assigns one.
- `payload`: validated data required by the worker.

New fields should be optional during migration so existing jobs can still be consumed.

## 4. Job lifecycle

1. A listener or service creates a validated job envelope.
2. The producer adds it to the named queue with retry and priority options.
3. BullMQ holds the job in waiting/delayed state until a worker claims it.
4. The worker logs the trace context and invokes the registry.
5. Success acknowledges the job and records completion metrics.
6. A retryable error returns the job with exponential backoff.
7. A non-retryable or final error is captured in the DLQ.

## 5. Failure rules

No job is successful merely because no worker is registered. Missing handlers, malformed envelopes, timeouts, provider outages, and stalled jobs must produce structured failures with queue, job, event, and trace metadata.

Retryable examples include temporary database outages, network timeouts, rate limits, and provider 5xx responses. Non-retryable examples include invalid payloads, unsupported event versions, and permanently invalid configuration.

## 6. Idempotency

Workers must not rely on an in-memory completed set. Domain-event jobs use durable `eventId` idempotency. Provider-facing jobs use a stable application key and persist delivery status where the provider supports verification.

The safe sequence is claim → execute side effect → mark completed. The implementation must document any unavoidable crash window around an external provider.

## 7. Priority and isolation

Use BullMQ priority values consistently: `1` is highest, `5` is normal, and `10` is low. Security-sensitive work such as password resets and security alerts must not share all available capacity with analytics or report generation.

Do not assign priority to every job. Use it only where a user or security SLA justifies preferential execution.

## 8. Worker capacity and locking

Concurrency is configured per queue with safe minimum and maximum values. Lock duration and renewal are selected from job characteristics; long-running jobs must renew their lock instead of being re-queued as stalled.

If `workerTimeoutMs` is configured, it must reject the job and participate in retry/DLQ behavior. It cannot forcibly stop arbitrary synchronous CPU-bound JavaScript, so those jobs should be split into smaller checkpointed units.

## 9. Rate limiting and downstream protection

Queues that call email, billing, AI, notification, or external APIs must use provider-aware rate limits. Limits are configuration, not arbitrary constants. Backoff should avoid retry storms when a provider returns a rate-limit response.

## 10. Observability

Queue logs and metrics should expose waiting, active, completed, failed, delayed, retried, stalled, and DLQ counts, plus queue wait and processing latency. Every record must be searchable by event ID, job ID, event name, queue, correlation ID, and causation ID.

## 11. Security and authorization

Normal users never manage DLQ records. Listing, inspecting, and replaying DLQ jobs requires an authenticated operational/admin capability. Replay re-enters the original queue and cannot bypass validation, authorization, retry, or idempotency.

## 12. Testing expectations

Test duplicate jobs, concurrent claims, missing workers, final retry to DLQ, metadata preservation, replay, priority ordering, invalid concurrency, lock configuration, timeout behavior, stalled-job logging, and trace preservation.

## 13. Trade-offs

BullMQ provides durable delivery, retries, delay, priority, and operational primitives without another broker. Redis availability and worker operations become part of the production responsibility, and eventual consistency must be visible to users.

## 14. Future work

- Add queue health endpoints to the existing operations surface.
- Add dashboards for latency, saturation, retries, and DLQ growth.
- Add autoscaling guidance based on queue depth and downstream limits.
- Split long-running jobs into checkpointed units where measurements justify it.
