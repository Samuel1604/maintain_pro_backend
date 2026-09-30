# Search Module Architecture

## Purpose

Search provides authenticated, tenant-scoped discovery across supported operational records. It is a read-only discovery capability and is not an authorization system.

## Current implementation

The module currently exposes `GET /api/v1/search` through `search.routes.ts`. Search behavior and supported record types are defined by the current route implementation. Callers must still rely on the owning resource endpoint for complete details and authorization-sensitive mutations.

## Boundaries

Search results must apply the authenticated organization/vendor scope before returning records. Domain modules remain responsible for canonical data, lifecycle rules, and persistence. Search does not create a second source of truth.

## Deferred work

Add a dedicated service/repository boundary if search behavior grows beyond the current route, document indexed fields and ranking rules, and add contract tests for tenant isolation, malformed queries, bounded result size, and unsupported resource types.
