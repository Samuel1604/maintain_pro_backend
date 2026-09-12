# Invitations Module Architecture

## Purpose

Invitations add people to an organization or vendor workspace with a selected role and scope. This module owns invitation creation, token lifecycle, acceptance, expiration, resend, revoke, and audit history.

## Folder map

Controllers and routes expose invitation actions. Schemas/types validate email, role, organization/vendor scope, and optional message. Services enforce inviter permission and state transitions. Repositories/models persist hashed tokens, status, expiry, and recipient metadata.

## Creation flow

1. An authorized lead or administrator submits an invitation.
2. The service validates role, scope, duplicate active invitations, and recipient limits.
3. A random token is hashed for storage and a single-use link is sent through email.
4. The invitation event is audited and delivery is queued.

## Acceptance flow

The recipient presents the token, which is hashed and matched. The service checks expiry, status, intended email, role, and tenant scope before creating or linking the user. Acceptance is atomic or idempotent so refreshes cannot create duplicate memberships.

## Security and failure

Raw tokens are never stored or logged. Expired, revoked, already-used, and mismatched invitations fail safely. Email delivery can retry independently; acceptance must not depend on sending a second message.

## Testing and future work

Test token hashing, expiry, resend, revoke, duplicate invitations, email mismatch, acceptance idempotency, role scope, tenant isolation, audit, and provider failure. Future work includes bulk invitations, directory synchronization, and invitation analytics.
