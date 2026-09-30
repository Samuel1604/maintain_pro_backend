# Dashboard Module Architecture

## Purpose

Dashboard aggregation provides read-focused operational summaries for portal views. It should combine authoritative domain data without becoming a separate system of record.

## Current implementation boundary

Dashboard aggregation code exists in `dashboard.aggregation.ts`, `dashboard.service.ts`, `dashboard.repository.ts`, and related types/controllers. The current application mounts report and role-dashboard workflows through the existing application routes; `dashboard.routes.ts` is currently a placeholder and is not mounted as a standalone API route.

## Decisions

- Dashboard values are derived from operational records and report queries.
- Tenant and role scope are applied before aggregation.
- Dashboard reads may be cached, but MongoDB and the owning domain services remain authoritative.
- New metrics belong in the report/dashboard aggregation boundary rather than duplicating business state in dashboard documents.

## Deferred work

Add a dedicated mounted dashboard API only if the current report-backed workflow no longer meets the frontend contract, then document its endpoint and authorization matrix before implementation.
