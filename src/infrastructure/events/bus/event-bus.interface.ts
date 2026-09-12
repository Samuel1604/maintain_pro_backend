import type { DomainEvent } from "./domain-event.js";
import type { EventHandler } from "./event-handler.interface.js";

export interface EventBus {
  publish<TEvent extends DomainEvent>(event: TEvent): Promise<void>;

  subscribe<TEvent extends DomainEvent>(
    eventName: TEvent["name"],
    handler: EventHandler<TEvent>,
  ): void;

  unsubscribe<TEvent extends DomainEvent>(
    eventName: TEvent["name"],
    handler: EventHandler<TEvent>,
  ): void;
}