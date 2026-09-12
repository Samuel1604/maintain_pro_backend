# Organizations Module Architecture

## 1. Purpose

Organizations are the primary tenant boundary. This module owns organization identity, settings, memberships, branding, marketplace policy, and organization-level lifecycle state.

## 2. Folder map

- Routes/controllers expose organization settings, profile, membership, and marketplace configuration.
- Schemas/types validate organization fields, settings, branding, and policy values.
- Services resolve the actor's organization and enforce administrator permissions.
- Repositories/models persist organization data and tenant-scoped indexes.
- Organization events notify audit, billing, invitations, and related modules.

## 3. Tenant flow

Every request receives an actor context from identity. Organization services resolve the organization from that context, authorize the role, validate the input, and query with an organization filter. A client-provided organization ID cannot override actor scope.

## 4. Settings and branding

Settings are organization-scoped and must not be mixed with user or vendor settings. Logo uploads use the uploads/storage boundary. Save operations validate the complete supported contract, persist atomically where practical, and emit an audit record.

## 5. Security and testing

Test cross-tenant reads, administrator versus member permissions, settings validation, logo ownership, marketplace policy access, partial updates, optimistic conflicts, and audit output.

## 6. Trade-offs and future work

Explicit tenant checks in services are clear but easy to omit. Future work includes repository-level tenant guards, organization lifecycle events, stronger settings schemas, and enterprise identity integrations.
