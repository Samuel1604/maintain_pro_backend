# Event-Processing Architecture (4 Tiers)

## Overview

```
Business Modules
      ↓
UniversalEventPublisher.publish(event)
      ↓
   classify: DomainEvent | IntegrationEvent
      ↓                              ↓
  EventBus (Tier 1 / Tier 3)    IntegrationEventPublisher (Tier 4)
      ↓                              ↓
InMemoryEventBus / QueuedEventBus   RabbitMQ
                ↓
          BullMQ (Tier 3, via listeners that dispatch named jobs)
```

Business modules depend on exactly two things: `UniversalEventPublisher`
and the two event base classes (`DomainEvent`, `IntegrationEvent`). They
never import `bullmq`, `amqplib`, or any concrete bus/publisher class.

## The four tiers

| Tier | Component                                          | Purpose                                                                           | Persistence                                              | Network       |
| ---- | -------------------------------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------- | ------------- |
| 1    | `InMemoryEventBus`                                 | Domain events, in-process module communication                                    | none                                                     | none          |
| 2    | `LocalTaskQueue`, `debounce`, `throttle`           | Buffering/throttling/debouncing/flow control                                      | none                                                     | none          |
| 3    | BullMQ (`QueueProducer`/`QueueService`/named jobs) | Background jobs: email, notifications, audit-heavy work, reports, imports/exports | Redis-backed                                             | Redis         |
| 4    | `RabbitMqIntegrationEventPublisher`                | Cross-service Integration Events                                                  | broker-durable (persistent messages, publisher confirms) | AMQP/RabbitMQ |

### Tier 1 — In-Memory Event Bus (`src/infrastructure/events/bus/in-memory-event-bus.ts`)

Already existed. Synchronous-ish dispatch (`Promise.allSettled` over
registered handlers), zero persistence, zero networking. This is the pure,
canonical Tier-1 implementation — reach for it directly (or via a future
`UniversalEventPublisher` wired to it) for genuinely same-process,
fire-and-forget domain events, and in tests.

### Tier 2 — Local Task Queue (`src/infrastructure/local-queue/`) — **new**

`LocalTaskQueue` (concurrency-bounded FIFO buffering) plus `debounce`/
`throttle` utilities. Process-local, volatile, non-business-critical by
design — nothing here survives a restart, and that's intentional: if
losing queued work on a crash would matter, it belongs on Tier 3, not
Tier 2. Delivered as a standalone, tested primitive; not force-wired into
Tier 1 or Tier 3 (see "What I deliberately did not do" below).

### Tier 3 — BullMQ (`src/infrastructure/queue/`)

Unchanged. Named background jobs (`SendInvitationEmailJob`,
`SendPasswordResetEmailJob`, `SendLoginNotificationJob`, ...) with retries,
delays, concurrency, and monitoring. Still reached today via
`QueueListener`, a `DomainEvent` handler that turns specific domain events
into specific background jobs — that boundary is untouched.

### Tier 4 — RabbitMQ (`src/infrastructure/integration-events/`) — **new**

`RabbitMqIntegrationEventPublisher`: publishes `IntegrationEvent`s to a
durable topic exchange (`RABBITMQ_EXCHANGE`, default
`maintainpro.integration-events`) using publisher confirms — `publish()`
doesn't resolve until the broker has acknowledged the message is written
to disk. Routing key defaults to the event's `name` but can be a
hierarchical key for topic-pattern binding by downstream consumers.
Connection is lazy and self-healing (a dropped connection is transparently
re-established on the next publish). This is the only file in the
codebase that imports `amqplib`, mirroring how `smtp.provider.ts` is the
only file that imports `nodemailer`.

RabbitMQ never touches background jobs — there is no job-processing code
anywhere near it. If this monolith later splits into services, Integration
Events are exactly the events another service would subscribe to; nothing
about that split requires touching a business module, only which events
get authored as `IntegrationEvent` instead of `DomainEvent`.

## Event classification

Two sibling base classes (not a hierarchy — `IntegrationEvent` does not
extend `DomainEvent`), so `instanceof` gives unambiguous routing:

- `DomainEvent` (existing) — internal to MaintainPro: `UserRegistered`,
  `EmailVerified`, `InvitationAccepted`, etc.
- `IntegrationEvent` (new, `src/infrastructure/events/bus/integration-event.ts`)
  — crosses a service/module boundary a future consumer needs delivered
  reliably.

`UniversalEventPublisher.publish(event)` is the single call business code
uses; it does the classification and routing, and throws if it's ever
handed something that's neither (a programming error, not a silent
no-op).

## What changed vs. what's new

**Nothing existing changed behavior.** `EventBus`, `QueuedEventBus`,
`InMemoryEventBus`, every existing listener, and every existing BullMQ job
are untouched. `AppContainer.eventBus` and `AppContainer.eventPublisher`
(the old `DefaultEventPublisher`) are still there, doing exactly what they
did before. The new `AppContainer.universalEventPublisher` and
`AppContainer.integrationEventPublisher` sit alongside them, additive.

**Adopting this for a new feature**, going forward, means a service takes
`UniversalEventPublisher` as a constructor dependency (instead of, or
alongside, `EventBus`) and calls `.publish()` with either event type — no
existing service was changed to do this, since that would mean touching
business logic.

## Verified against real infrastructure

Not just type-checked — run end-to-end against a real local RabbitMQ
(installed via apt, same as the earlier Redis/Mailpit work):
`UniversalEventPublisher.publish()` correctly kept a `DomainEvent`
entirely in-process (confirmed via an in-memory subscriber) and delivered
an `IntegrationEvent` to an independent RabbitMQ consumer bound to the
durable exchange, with the correct routing key and payload intact. The
broker-unavailable path was also verified: pointed at an unreachable
address, `sendEmail`-style, it throws `IntegrationEventBrokerUnavailable`
— never a raw `amqplib` error.

## Review: unnecessary complexity / coupling identified

1. **`QueuedEventBus` is already doing two jobs, and that's pre-existing,
   not something this change introduced.** Publishing a `DomainEvent`
   today goes: `EventBus.publish()` → BullMQ `domain-events` queue →
   `DomainEventWorker` → `EventDispatcher` → registered listeners run
   inline in the worker process. That's Tier 1's job (dispatch to
   handlers) implemented via Tier 3's transport (BullMQ), for durability.
   It works, and I did not touch it (redesigning it was explicitly out of
   scope), but it means "Tier 1" in this codebase today is really "Tier 1
   semantics over a Tier 3 transport," not the zero-persistence primitive
   the tiered model describes. `InMemoryEventBus` — the actual pure Tier-1
   implementation — exists but isn't wired into `AppContainer` at all. If
   a genuinely synchronous, zero-persistence domain-event path is wanted
   for latency-sensitive same-process communication, swapping which
   `EventBus` implementation `AppContainer` constructs is a one-line
   change (both implement the same interface) — but that's a deliberate
   choice for whoever owns that tradeoff, not something I changed here.

2. **Tier 2 has no forced integration point, on purpose — but that means
   it's inert until someone adopts it.** I considered wiring
   `LocalTaskQueue` into `InMemoryEventBus`'s dispatch loop (to literally
   satisfy Tier 1's "lightweight asynchronous" characteristic), but that
   would have meant modifying existing Tier-1 code for a tier that has no
   callers yet — coupling two tiers together before anything needs it. I
   left them independent. The tradeoff: Tier 2 is fully tested and ready,
   but nothing in the app calls it today. That's a reasonable state for
   infrastructure introduced ahead of a concrete need, but worth flagging
   so it doesn't look forgotten.

3. **Two "universal-ish" publishers now exist side by side:
   `DefaultEventPublisher` (old, thin wrapper over `EventBus`) and
   `UniversalEventPublisher` (new, classifies and routes across
   `EventBus`/RabbitMQ).** I kept both rather than replacing the old one,
   since nothing consumes `DefaultEventPublisher` today (confirmed by
   search) and removing it wasn't necessary to deliver this — but it is
   dead code sitting next to its own replacement, which is exactly the
   kind of duplication worth cleaning up once you're confident nothing
   external depends on the old name. I did not delete it because "do not
   introduce breaking changes" was an explicit constraint, and I have no
   way to confirm nothing outside this codebase snapshot imports it.

4. **No graceful shutdown wiring exists for any of this yet** — not
   RabbitMQ, not BullMQ, not Redis. I added `AppContainer.shutdown()`
   (closes the new RabbitMQ connection and the BullMQ producer) but
   nothing calls it; there's no `SIGTERM`/`SIGINT` handler in
   `server.ts`/`workers.ts` today. Wiring that up would have meant
   touching the process bootstrap files, which felt like more than
   "extend the event infrastructure" — flagging it rather than doing it.

5. **`RABBITMQ_URL` defaults to `guest:guest@localhost`** (RabbitMQ's
   well-known default credentials), matching the existing pattern for
   Redis/Mongo defaults in this codebase. That default is fine for local
   dev but must never reach a real environment — same caveat that already
   applies to the existing Redis/Mongo defaults, not a new risk this
   change introduces.

# Queue reliability runbook

The existing domain-event pipeline uses BullMQ and Redis. Domain events retain
`eventId`, `correlationId`, and `causationId` in the queue envelope. The queue
job name (`domain-event.dispatch`) is transport metadata; structured logs use
the originating `eventName`.

## Idempotency

Domain-event delivery is claimed in the MongoDB `ProcessedEvent` collection,
which has a unique index on `eventId`. A worker claims an event, executes its
handlers, then marks it completed. Failed claims are lease-based so a crashed
worker can be retried. This protects concurrent workers and restarts. External
providers such as email cannot guarantee exactly-once delivery; handlers should
use provider idempotency keys where supported and persist delivery state.

## Retries and DLQ

Queues default to five exponential attempts with a two-second base delay. A
final failure is copied to the BullMQ `domain-events.dlq` queue with the full
original envelope, error, attempts, and trace identifiers. Missing workers are
failures and therefore retry/DLQ rather than being acknowledged. Operators use
`DeadLetterAdminService` to list, inspect, and replay jobs. Replay is capped at
three attempts and creates a new delivery job ID while preserving the original
event identity.

## Capacity and priority

Queue concurrency can be configured with `<QUEUE_NAME>_CONCURRENCY` variables,
for example `EMAIL_CONCURRENCY` and `DOMAIN_EVENTS_CONCURRENCY`; values must be
positive and are capped at 100. BullMQ priority values follow `1 = critical`,
`5 = normal`, and `10 = low`. Email and AI queues have provider-oriented rate
limits configured in `queue.config.ts`.

## Locks, timeouts, and stalled jobs

Workers use a 60-second lock with a 20-second renewal interval. The configured
30-second worker timeout is enforced with an async timeout and participates in
normal retries and DLQ handling. A timeout cannot terminate arbitrary
synchronous CPU-bound work; such work should be split into checkpointed jobs.
Stalled jobs are logged with queue, job, event, and correlation identifiers;
BullMQ retains responsibility for re-queuing them.

## Operational tracing

Search logs by `eventId`, `jobId`, `eventName`, `queue`, `correlationId`, or
`causationId`. These values survive event publication, queue processing,
failure, DLQ capture, and replay.

## RabbitMQ integration test

RabbitMQ is an optional external integration dependency. The durable routing
test runs only when `RABBITMQ_TESTS=true` and uses `RABBITMQ_URL` (defaulting to
the local guest broker). Application-only tests remain runnable without a
broker; CI environments that provision RabbitMQ should enable the flag.

For local verification, start `docker compose -f docker-compose.infrastructure.yml
up -d rabbitmq`, then run the test suite with `RABBITMQ_TESTS=true`.
