# Shared Platform Architecture

## Purpose

Shared code contains generic primitives used across modules: errors, middleware, validation helpers, result types, authorization helpers, common DTO types, and small utilities.

## Folder map

- `errors/` defines safe application error types and status mapping.
- `middleware/` handles authentication, authorization, validation, rate limits, CSRF, and error translation.
- `services/` contains generic services such as Redis or permission helpers.
- `types/` contains cross-module contracts that do not belong to one domain.
- `utils/` contains deterministic helpers with no business ownership.

## Dependency rule

Shared code may be imported by modules and infrastructure, but it must not import a business module or encode organization-specific workflow rules. If a helper needs a module's model or policy, it belongs in that module.

## Error and security flow

Middleware converts a request into an authenticated actor or a safe error. Error handlers expose constructed user-safe messages while logging internal context. Shared helpers must redact secrets and preserve trace IDs.

## Mutation retry safety

The idempotency middleware reads the client `Idempotency-Key` header for POST, PUT, PATCH, and DELETE requests. Redis atomically claims the key, records a request fingerprint, and caches successful responses for 24 hours. Concurrent retries wait for the owner and replay its result; reusing a key with different data is rejected. Authentication endpoints are excluded because login responses also establish cookies; transient failures are never cached. This protects users from duplicate writes after a timeout while keeping business-level idempotency in the owning module for operations that need durable state or provider-specific keys.

## Testing and trade-offs

Test middleware ordering, authorization outcomes, validation, rate limits, CSRF, error mapping, serialization, and utility edge cases. Shared code reduces duplication but can become an accidental dependency layer, so APIs should remain small.

## Future work

Add dependency-boundary linting, shared contract tests, stronger redaction checks, and a documented deprecation process for cross-module primitives.
