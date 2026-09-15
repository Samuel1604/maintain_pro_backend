# MaintainPro Backend Architecture

## Purpose

The backend is a modular monolith organized around domain modules and shared infrastructure. HTTP APIs, asynchronous jobs, domain events, persistence, and external integrations remain in one deployable application while boundaries keep business capabilities independently evolvable.

## Architectural decisions

- Domain modules own business rules, schemas, repositories, services, and routes.
- Infrastructure owns BullMQ, MongoDB-facing adapters, logging, realtime delivery, storage, and external providers.
- Domain events use stable event IDs and correlation/causation metadata.
- BullMQ is the single durable job transport; Redis is the operational queue store.
- MongoDB is the durable system of record and processed-event idempotency store.
- Shared services provide cross-cutting authorization, errors, validation, and response conventions.

## Trade-offs

This keeps deployment and local development simple, but a modular monolith requires discipline to prevent modules from importing each other’s internals. MongoDB transactions are available for related writes, while external provider effects cannot be made strictly exactly-once. BullMQ adds operational Redis requirements in exchange for retries, scheduling, and worker isolation.

## Future improvements and integrations

Strengthen module-level dependency checks, expand provider idempotency keys, add OpenTelemetry-compatible tracing, and separate worker deployments when queue volume justifies it. The backend already contains an outbox for transactional event publication. New integrations should enter through infrastructure adapters rather than domain modules.
