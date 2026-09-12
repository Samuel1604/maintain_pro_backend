import { DomainEvent } from "../bus/domain-event.js";
import { IntegrationEvent } from "../bus/integration-event.js";
import type { EventBus } from "../bus/event-bus.interface.js";
import type { IntegrationEventPublisher } from "@/infrastructure/integration-events/integration-event-publisher.interface.js";
import type { Logger } from "@/infrastructure/logging/logger.interface.js";

/**
 * UniversalEventPublisher
 *
 * The single entry point business modules use to publish ANY event:
 *
 *     await this.eventPublisher.publish(new SomeDomainEvent(...));
 *     await this.eventPublisher.publish(new SomeIntegrationEvent(...));
 *
 * Routing is entirely automatic, based on which of the two event base
 * classes the event is an instance of:
 *
 *   - DomainEvent      → the configured domain EventBus (Tier 1, and/or
 *                         Tier 3 for handlers that dispatch background
 *                         jobs — see EventBus's own docs for which
 *                         concrete implementation is wired in this
 *                         environment).
 *   - IntegrationEvent → the IntegrationEventPublisher (Tier 4 / RabbitMQ).
 *
 * Business modules never see EventBus, BullMQ, or RabbitMQ — only this
 * class and the two event base classes. That indirection is exactly what
 * makes a future modular-monolith → microservices migration possible
 * without touching business code: only this file's routing needs to
 * change, e.g. to route a given DomainEvent to RabbitMQ too once another
 * service needs to hear about it.
 */
export class UniversalEventPublisher {
  constructor(
    private readonly domainEventBus: EventBus,
    private readonly integrationEventPublisher: IntegrationEventPublisher,
    private readonly logger?: Logger,
  ) {}

  async publish(event: DomainEvent | IntegrationEvent): Promise<void> {
    if (event instanceof IntegrationEvent) {
      await this.integrationEventPublisher.publish(event);
      return;
    }

    if (event instanceof DomainEvent) {
      await this.domainEventBus.publish(event);
      return;
    }

    // Exhaustiveness guard — every event MUST be one of the two
    // classifications. A new event base class showing up here without a
    // routing rule is a programming error, not a runtime edge case to
    // silently swallow.
    this.logger?.error("[UniversalEventPublisher] Unclassifiable event — neither DomainEvent nor IntegrationEvent", {
      event,
    });
    throw new Error(
      "UniversalEventPublisher.publish() received an event that is not a DomainEvent or an IntegrationEvent.",
    );
  }
}
