# Users Module Architecture

## 1. Purpose

Users represent people who operate MaintainPro. This module owns profiles, names, contact details, organization/vendor membership references, roles, preferences, and safe user reads.

## 2. Folder map

- `user.controller.ts` exposes profile and administrative user operations.
- `user.service.ts` applies membership, profile, invitation, and account-state rules.
- `user.reader.ts` provides narrow read methods for authentication and authorization.
- `user.repository.ts` owns persistence and indexed queries.
- `user.types.ts` and schemas define input, output, role, and status contracts.
- Identity owns passwords, sessions, OAuth, OTP, and recovery credentials.

## 3. User lifecycle

A user is created through registration or invitation, linked to an organization or vendor, assigned a role, and later activated, suspended, deactivated, or removed according to policy. Membership changes must be audited and must revoke access when required.

## 4. Boundaries

Readers should return only fields needed by the caller. Password hashes, token hashes, recovery data, and security metadata must not appear in ordinary responses. Organization and vendor services enforce tenant scope; identity handles authentication state.

## 5. Testing expectations

Test profile validation, role changes, membership isolation, invitation acceptance, deactivation, safe projections, authentication reader behavior, password-change integration, and audit events.

## 6. Trade-offs and future work

Central user ownership simplifies authorization, while identity and membership workflows span several modules. Future work includes SCIM/directory provisioning, richer profile preferences, and audit projections.
