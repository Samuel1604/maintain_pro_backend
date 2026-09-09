# Event Idempotency Architecture

## Purpose
This folder prevents one domain event from producing the same successful side effect more than once.

## Navigation
The store persists event identity and processing status. Workers claim an event, execute the handler, and mark it completed after success.

## Flow
`eventId` is the stable key. A unique constraint protects concurrent workers; retries use durable state instead of an in-memory set.

## Boundaries
Database changes should use atomic updates or transactions where practical. External providers may still require their own idempotency keys.

## Trade-offs and future work
Durable claims survive restarts but add cleanup work. Add metrics, stale-claim recovery, and provider delivery records for external effects.
