# Source Architecture

## What this folder contains

The backend is a modular monolith. It keeps one deployable application while separating business areas and technical concerns so a developer can find ownership quickly.

- `config/` validates environment and runtime configuration.
- `container/` wires application dependencies together.
- `infrastructure/` contains queues, events, logging, storage, realtime, and other technical adapters.
- `modules/` contains business capabilities such as work orders, billing, identity, and vendors.
- `shared/` contains small cross-cutting helpers and types that do not belong to one business area.
- `tests/` contains unit, integration, and infrastructure verification.

## How code should move through the system

Routes validate and authorize a request, controllers translate it into a use-case call, services enforce business rules, and repositories/models persist data. Events and queues are used when work does not need to finish during the request.

New business behavior belongs in the closest module. New technical behavior belongs in infrastructure. Shared code must remain generic and must not import a business module.

## Architectural decision

This structure gives clear ownership without prematurely splitting MaintainPro into services. The trade-off is that module boundaries must be respected or the dependency graph can become difficult to change.

## Future improvements

Add dependency-boundary linting, keep module APIs explicit, and introduce a small application layer only when a workflow genuinely coordinates several modules. Keep deployment as a modular monolith until operational needs justify distribution.
