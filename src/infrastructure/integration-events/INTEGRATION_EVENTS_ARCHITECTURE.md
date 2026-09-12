# Integration Events Architecture

## Purpose
Integration events describe messages that leave MaintainPro for another system or deployment boundary.

## Navigation
The event contract and publisher define the message shape. Provider adapters handle transport details; modules publish through an injected interface.

## Flow
A module emits an event with trace IDs, the publisher sends it through the configured adapter, and failures follow transport retry policy.

## Boundaries
Payloads must be versionable, minimal, and free of secrets. External provider types must not leak into domain modules.

## Trade-offs and future work
Adapters preserve deployment flexibility but require compatibility. Add schema versioning, delivery receipts, and outbox support for critical integrations.
