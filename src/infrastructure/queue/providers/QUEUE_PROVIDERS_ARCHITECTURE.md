# Queue Providers Architecture

## Purpose
Queue providers adapt the shared job contract to BullMQ or the in-memory test driver.

## Navigation
The provider owns connection, serialization, retry, priority, delay, and worker configuration. Modules use the queue interface, not BullMQ directly.

## Flow
The producer adds a traced job to a named queue. The provider worker invokes the registry and reports completion or failure to queue policy.

## Boundaries
Provider errors must preserve job metadata and never silently acknowledge an unhandled job. Settings come from validated configuration.

## Trade-offs and future work
An adapter keeps tests fast and production transport replaceable. Add provider contract tests and health reporting for each driver.
