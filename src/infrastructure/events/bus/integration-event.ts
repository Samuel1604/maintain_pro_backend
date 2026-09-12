import { randomUUID } from "node:crypto";

/**
 * IntegrationEvent
 *
 * The second of the two event classifications (see DomainEvent for the
 * first). Deliberately NOT a subclass of DomainEvent — they are siblings,
 * not a hierarchy — so `instanceof` gives the Universal Event Publisher an
 * unambiguous way to classify and route any event without either event
 * type knowing the other exists.
 *
 * Use IntegrationEvent for something another service/module boundary
 * needs to durably receive — data that has left MaintainPro's own request
 * lifecycle and now represents a fact the outside world (a future
 * microservice, a partner system, an internal service once this monolith
 * is split) needs delivered reliably. Domain-internal side effects
 * (sending a confirmation email, writing an audit log entry, notifying
 * another module in-process) are DomainEvents, not IntegrationEvents.
 *
 * Characteristics (enforced by the Tier 4 / RabbitMQ publisher, not by
 * this class): durable, guaranteed delivery, exchange-routed by
 * `routingKey`.
 */
export abstract class IntegrationEvent<TPayload = unknown> {
  public readonly eventId: string;
  public readonly occurredAt: Date;

  protected constructor(
    /** Event name — also used as the default routing key. */
    public readonly name: string,
    public readonly payload: TPayload,
    /**
     * Exchange routing key. Defaults to `name`, but can differ from it
     * (e.g. a hierarchical key like "maintainpro.workorder.completed" for
     * topic-exchange pattern matching by downstream consumers).
     */
    public readonly routingKey: string = name,
    occurredAt?: Date,
    eventId?: string,
  ) {
    this.eventId = eventId ?? randomUUID();
    this.occurredAt = occurredAt ?? new Date();
  }
}
