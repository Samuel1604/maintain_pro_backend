# MaintainPro API endpoint architecture

## Purpose

MaintainPro exposes one versioned HTTP API under `/api/v1`. Each module owns a resource collection and its authorization, validation, and persistence rules. The frontend keeps paths in one endpoint registry so route changes do not spread through components.

## Naming rules

- Use plural resource nouns: `/work-orders`, `/service-requests`, `/invoices`.
- Use query parameters for filtering, sorting, pagination, and search: `/work-orders?status=pending_completion&page=1`.
- Nest only true child resources: `/work-orders/:id/comments` and `/work-orders/:id/attachments`.
- Use `PATCH` for partial resource changes and `DELETE` for archival/removal operations.
- Use explicit command subresources for business transitions that are not ordinary field edits, such as `/completion/approve` or `/completion/request-information`.
- Keep administrative operations under `/api/v1/admin` and never expose operational queue controls to ordinary users.

## Compatibility and evolution

Existing action routes remain supported while clients migrate to resource/query routes. New routes must not create role-specific copies of the same collection. For example, finance approvals use `/work-orders?status=pending_completion`; the older `/work-orders/finance/pending-approval` path is retained only as a compatibility alias.

## Response and errors

All routes use the shared response enhancer and error handler. List endpoints return data plus pagination metadata. Mutations return the saved resource or a command result. Authorization, organization scope, and validation happen before persistence.

## Future improvements

The route registry can later generate an OpenAPI document, deprecation headers can be added to compatibility aliases, and cursor pagination can replace page pagination for very large collections without changing resource names.
