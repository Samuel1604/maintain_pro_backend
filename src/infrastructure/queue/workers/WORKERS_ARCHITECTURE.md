# Worker Architecture

## Purpose

Workers execute asynchronous side effects and long-running tasks outside HTTP requests. They translate queue envelopes into calls to email, notification, audit, billing, marketplace, report, or domain services.

## Folder map

Each worker file handles one stable job name. The worker registry maps names to implementations. Queue providers own BullMQ lifecycle; workers own validation, service delegation, and result/error reporting.

## Execution flow

1. A provider claims a job and supplies the queue envelope.
2. The worker logs event/job/correlation metadata.
3. The registry resolves a handler; missing handlers are failures.
4. The handler validates payload and performs an idempotent side effect.
5. Success acknowledges the job; failure returns through retry and DLQ policy.

## Reliability rules

Workers must not silently swallow failures or depend on in-memory duplicate sets. Long jobs need lock renewal and functional timeout behavior. External effects should use stable idempotency keys and persist delivery state where possible.

## Capacity and security

Concurrency is configured per queue with safe bounds. Security-critical jobs must retain dedicated capacity. Workers must not log secrets or trust unvalidated payloads from Redis.

## Testing and trade-offs

Test handler success, invalid payloads, missing registrations, duplicate delivery, retries, timeout, stalled logging, concurrency, and trace preservation. Small workers are easy to retry, but many workers increase registration and monitoring work.

## Future work

Add provider delivery receipts, per-worker latency metrics, queue saturation dashboards, checkpointed long jobs, and automated capacity recommendations.
