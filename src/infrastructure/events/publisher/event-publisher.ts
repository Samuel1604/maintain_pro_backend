import type { DomainEvent, EventBus } from "../bus/index.js";
import type { EventPublisher } from "./event-publisher.interface.js";

export class DefaultEventPublisher implements EventPublisher {
  constructor(private readonly eventBus: EventBus) {}

  public async publish<TEvent extends DomainEvent>(
    event: TEvent,
  ): Promise<void> {
    await this.eventBus.publish(event);
  }
}
