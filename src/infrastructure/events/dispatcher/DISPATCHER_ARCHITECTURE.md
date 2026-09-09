# Event Dispatcher Architecture

## Purpose
The dispatcher connects published domain events to registered listeners and isolates listener failures from the original request.

## Navigation
Dispatching and listener registration live here. Event definitions belong in the bus folder; business reactions belong in their owning module.

## Flow
The dispatcher receives an event, finds listeners, invokes them, and records failures with event tracing metadata.

## Boundaries
The dispatcher coordinates delivery but does not decide business state or hide a failed listener. Queue listeners must reject jobs for retry and DLQ handling.

## Trade-offs and future work
Listener isolation improves resilience but introduces eventual consistency. Add handler timing metrics and version-aware registration as the catalog grows.
