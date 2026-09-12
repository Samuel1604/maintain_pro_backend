# Realtime Infrastructure Architecture

## Purpose

Realtime infrastructure delivers authorized live updates to connected clients. It improves responsiveness but is never the durable source of truth; clients can always recover through normal API reads.

## Folder map

The publisher translates domain events into client-safe payloads. Socket/session adapters manage connections, authentication, subscriptions, tenant channels, and disconnects. Shared event names should remain documented and stable.

## Flow

1. A domain event is received by the realtime publisher.
2. The publisher checks target organization, vendor, user, or facility scope.
3. Sensitive server fields are reduced to a client-safe payload.
4. The message is emitted to authorized connections.
5. Disconnected clients receive the current state through a later API request.

## Security and reliability

Connection authentication is separate from per-event authorization. Never trust a client-provided channel name. Realtime delivery may be duplicated or missed, so consumers should use IDs and refresh state when ordering matters.

## Testing and operations

Test connection authentication, channel authorization, tenant isolation, payload redaction, disconnect behavior, duplicate events, and publisher failure. Monitor connection count, emit latency, errors, and dropped messages.

## Trade-offs and future work

Realtime improves user experience but adds connection lifecycle and horizontal-scaling concerns. Future work includes adapter health metrics, replay-from-state, connection limits, and stronger channel authorization tests.
