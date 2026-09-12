# Event Bus Architecture

## Purpose
The event bus is the in-process entry point for domain events. It lets modules announce completed facts without directly calling every reaction.

## Navigation
The event type defines the envelope, the bus publishes it, and listeners subscribe through the application container. Integration-event types are separate.

## Flow
A module creates an event with stable IDs, the bus dispatches it to listeners, and queue-backed listeners preserve the envelope for asynchronous work.

## Boundaries
Events are facts, not commands. They must not contain secrets, and listeners must tolerate duplicate delivery.

## Trade-offs and future work
In-process delivery is simple and fast but depends on the running process. Add version compatibility and outbox support before cross-process guarantees are needed.
