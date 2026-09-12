import type { DomainEvent } from "./domain-event.js";
import type { EventBus } from "./event-bus.interface.js";
import type { EventHandler } from "./event-handler.interface.js";
import type { Logger } from "@/infrastructure/logging/logger.interface.js";

export class InMemoryEventBus implements EventBus {
  private readonly listeners = new Map<string, Set<EventHandler>>();

  constructor(private readonly logger?: Logger) {}

  public async publish<TEvent extends DomainEvent>(
    event: TEvent,
  ): Promise<void> {
    const handlers = this.listeners.get(event.name);

    if (!handlers?.size) {
      return;
    }

    const results = await Promise.allSettled(
      [...handlers].map((handler) => handler.handle(event)),
    );

    const failures = results.filter(
      (result): result is PromiseRejectedResult => result.status === "rejected",
    );

    if (failures.length > 0) {
      this.logger?.error(
        `[EventBus] ${failures.length} listener(s) failed while handling "${event.name}".`,
        failures.map((failure) => failure.reason),
      );
    }
  }

  public subscribe<TEvent extends DomainEvent>(
    eventName: TEvent["name"],
    handler: EventHandler<TEvent>,
  ): void {
    const handlers = this.listeners.get(eventName);

    if (handlers) {
      handlers.add(handler);
      return;
    }

    this.listeners.set(eventName, new Set<EventHandler>([handler]));
  }

  public unsubscribe<TEvent extends DomainEvent>(
    eventName: TEvent["name"],
    handler: EventHandler<TEvent>,
  ): void {
    const handlers = this.listeners.get(eventName);

    if (!handlers) {
      return;
    }

    handlers.delete(handler);

    if (handlers.size === 0) {
      this.listeners.delete(eventName);
    }
  }
}
