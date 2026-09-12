# Notifications Module Architecture

## 1. Purpose

Notifications decide who should be informed about a domain change, create durable in-app records, and request delivery through email or future channels.

## 2. Folder map

- Configuration defines supported actions, channels, and recipient policy.
- Services evaluate policy and create notification records.
- Event listeners translate domain events into notification requests.
- Repositories/models query unread, historical, and tenant-scoped notifications.
- Queue workers deliver external channels without blocking the event publisher.

## 3. Flow

1. A domain event identifies an action and affected entity.
2. Policy resolves recipients from organization, vendor, facility, role, and preferences.
3. A durable notification is written with a stable idempotency key.
4. Channel jobs are queued with event trace metadata.
5. Delivery updates status or records a failure while the in-app record remains available.

## 4. Boundaries

Policy decides audience; email decides message delivery; identity provides user and preference context; modules remain owners of their domain state. Notifications must never expose records outside the actor's tenant scope.

## 5. Reliability and testing

Duplicate events must not create duplicate successful notifications. Test recipient policy, preferences, tenant filtering, unread state, channel failure, retry/DLQ behavior, idempotency, and notification ordering where relevant.

## 6. Trade-offs and future work

Central policy is auditable but each channel can fail independently. Future work includes push, SMS, user-configurable escalation chains, digest delivery, and notification retention controls.
