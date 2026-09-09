import type { DomainEvent } from "../bus/domain-event.js";
import type { EventRegistry } from "../registry/event.registry.js";
import type { Logger } from "@/infrastructure/logging/logger.interface.js";

export class EventDispatcher {
  constructor(
    private readonly registry: EventRegistry,
    private readonly logger?: Logger,
  ) {}

  handlersFor<TEvent extends DomainEvent>(event: TEvent) {
    return this.registry.getHandlers(event.name);
  }

  async dispatch<TEvent extends DomainEvent>(event: TEvent): Promise<void> {
    const startedAt = Date.now();
    const handlers = this.handlersFor(event);

    if (handlers.length === 0) {
      this.logger?.warn("[EventBus] No handlers registered", {
        eventName: event.name,
        eventId: event.eventId,
      });
      throw new Error(`No handlers registered for domain event: ${event.name}`);
    }

    const results = await Promise.allSettled(handlers.map((handler) => handler.handle(event)));
    const failures = results.filter((result): result is PromiseRejectedResult => result.status === "rejected");
    const durationMs = Date.now() - startedAt;

    if (failures.length > 0) {
      this.logger?.error("[EventBus] Handler dispatch failed", {
        eventName: event.name,
        eventId: event.eventId,
        durationMs,
        failures: failures.length,
      });
      // Safe: guarded by failures.length > 0 above.
      throw failures[0]!.reason;
    }

    this.logger?.info("[EventBus] Event dispatched", {
      eventName: event.name,
      eventId: event.eventId,
      durationMs,
      success: true,
    });
  }
}
