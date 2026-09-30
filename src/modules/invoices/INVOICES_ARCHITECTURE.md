# Invoices Module Architecture

## Purpose

Invoices represent vendor-submitted charges connected to an organization and, where available, a work order or contract. The module supports review, approval, payment marking, disputes, listing, and PDF retrieval.

## Current implementation boundary

Invoice behavior is currently implemented in `invoice.routes.ts` around the `Invoice` model. It is a functioning MVP boundary, but it does not yet follow the full route-controller-service-repository layering used by the core modules. New invoice behavior should not expand the route-level implementation; future changes should first extract the business transitions into a service and repository.

## Lifecycle

Invoices use the statuses `submitted`, `under_review`, `approved`, `rejected`, `paid`, and `disputed`. Review and payment transitions are restricted by role and organization scope. The unique organization/invoice-number index prevents duplicate invoice numbers within an organization.

## Routes

- `GET /api/v1/invoices`
- `GET /api/v1/invoices/:id/pdf`
- `PATCH /api/v1/invoices/:id/review`
- `PATCH /api/v1/invoices/:id/paid`
- `PATCH /api/v1/invoices/:id/dispute`

## Deferred work

Extract invoice application logic from the route file, add DTO mapping, formalize vendor/organization scope checks in a service boundary, and add dedicated invoice architecture and integration tests.
