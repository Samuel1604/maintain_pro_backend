# Dead Letter Queue Architecture

## Purpose

The DLQ preserves jobs that cannot be completed after safe retry handling. It prevents poison jobs from blocking normal work and gives operations a searchable diagnosis and replay path.

## Folder map

The DLQ producer captures final failures. The record type stores original queue/job/event IDs, event name, payload, attempts, error, timestamps, and correlation metadata. Admin services list, inspect, and replay records.

## Capture flow

1. A worker rejects a job.
2. Retry policy evaluates whether another attempt is safe.
3. The final failure is copied to `domain-events.dlq` with the original envelope.
4. Structured logging and optional operational alerting record the failure.
5. The original event identity remains available for diagnosis and idempotency.

## Replay flow

Replay creates a new delivery/job attempt and re-enters the original queue. It preserves event, correlation, and causation IDs, resets normal retry handling, and tracks replay count to prevent unlimited loops.

## Security and retention

Only authorized operational administrators may inspect or replay DLQ records. Payloads must be redacted in UI responses where necessary. Retention should be long enough for incident response and bounded by an operational policy.

## Testing and trade-offs

Test final retry capture, missing-worker failures, metadata preservation, inspection, authorization, replay, idempotency, and replay limits. Redis compatibility is simple, but long-term archive and large-payload retention require operational planning.
