# Infrastructure Architecture

## Purpose

Infrastructure adapts technical systems to application interfaces. It contains MongoDB and Redis access, queues, events, logging, storage, realtime delivery, scheduled jobs, and external providers.

## Folder map

Configuration supplies validated settings. Events coordinate facts and listeners. Queues and workers run durable asynchronous work. Cache provides temporary acceleration. Storage handles files. Logging records operations. Realtime publishes client updates. Integration adapters isolate external SDKs.

## Dependency direction

Business modules may depend on infrastructure interfaces or injected adapters. Infrastructure must not import private business rules. Provider-specific errors, payloads, credentials, and SDK types stay inside the adapter boundary.

## Lifecycle

The composition root creates connections and providers during startup, registers listeners and workers, exposes health information, and closes resources during shutdown. Optional integrations must be explicitly disabled or fail clearly when selected.

## Reliability standards

Technical adapters preserve event/job tracing, classify retryable failures, avoid silent acknowledgements, and expose operational errors. Long-running queue work renews locks; external side effects use idempotency where possible.

## Security and testing

Secrets remain in configuration. Logs redact sensitive data. Every adapter should have contract tests, failure tests, and lifecycle tests. Infrastructure integration tests may use real local dependencies; unit tests use fakes.

## Trade-offs and future work

Adapters add indirection but keep vendor technology replaceable and the modular monolith deployable. Future work includes stronger health checks, metrics, dependency-boundary linting, and adapter contract automation.
