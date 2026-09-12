# Composition Root Architecture

## Purpose

The application container is the composition root. It constructs repositories, services, event buses, queue producers and consumers, workers, providers, and listeners so dependencies are explicit.

## Folder map

`app.container.ts` contains production wiring. Module constructors define what each service needs. Provider factories select implementations. Listener and worker registration connects asynchronous infrastructure to domain behavior.

## Startup and shutdown

The application creates the container once during startup, registers routes and listeners, then starts transport connections and workers. Shutdown should stop workers, close Redis/MongoDB connections, and allow in-flight work to finish within a bounded period.

## Dependency rules

Business services receive dependencies through constructors. They should not import a global service locator or construct providers inside methods. Tests may replace repositories, providers, and queues with fakes.

## Failure behavior

Missing required dependencies or invalid provider configuration should fail startup. Optional integrations may be disabled explicitly, but a selected unavailable capability must fail visibly rather than silently falling back.

## Trade-offs and future work

Central wiring makes lifecycle and dependencies inspectable but creates a large composition file. Future work includes bounded-context factory functions, lifecycle interfaces, and dependency-boundary checks.
