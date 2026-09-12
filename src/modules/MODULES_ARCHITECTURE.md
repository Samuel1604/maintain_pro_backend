# Domain Modules Architecture

## Purpose

Each module owns one business capability and its rules. Modules keep domain models, schemas, repositories, services, routes, controllers, events, policies, and tests close to the behavior they protect.

## Standard folder map

- Routes define endpoints and middleware order.
- Controllers translate HTTP input/output and do not contain deep business rules.
- Schemas and DTOs validate data at the boundary.
- Services enforce authorization, lifecycle, and business decisions.
- Repositories and models own persistence details and indexes.
- Event services publish facts; listeners handle cross-cutting reactions.
- Architecture/API documents explain decisions and public contracts.

## Dependency direction

Modules may use shared primitives, injected infrastructure interfaces, and another module's public service or event contract. They must not import another module's private model, repository, or policy.

## Request flow

Authentication creates actor context, route middleware checks access, controllers validate and translate input, services apply rules, repositories persist, and events/audit expose consequential changes. Errors are mapped through shared error handling.

## Tenant and permission rules

Every organization/vendor/facility-owned query must scope to the actor's context. Client IDs never override server-derived scope. Each module documents which roles may read, create, review, modify, or delete its records.

## Reliability standards

Mutations should be idempotent when retries are possible. Events preserve trace IDs. Queue work rejects failures for retry/DLQ handling. External side effects document their exactly-once limitation.

## Testing standard

Each module should test service rules, tenant isolation, state transitions, repository boundaries, event/audit output, and route contracts. Add integration tests where multiple modules or infrastructure adapters interact.

## Trade-offs and future work

Bounded modules preserve one deployable system and clear ownership, but cross-module workflows require explicit contracts and eventual-consistency handling. Future work includes dependency-boundary checks, contract generation, and focused application services for multi-module workflows.
