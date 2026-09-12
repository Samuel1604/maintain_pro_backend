import type { DomainEvent } from "../bus/domain-event.js";
import type { EventHandler } from "../bus/event-handler.interface.js";

export class EventRegistry {
  private readonly handlers = new Map<string, Set<EventHandler>>();

  register<TEvent extends DomainEvent>(eventName: string, handler: EventHandler<TEvent>): void {
    const handlers = this.handlers.get(eventName) ?? new Set<EventHandler>();
    handlers.add(handler as EventHandler);
    this.handlers.set(eventName, handlers);
  }

  unregister<TEvent extends DomainEvent>(eventName: string, handler: EventHandler<TEvent>): void {
    const handlers = this.handlers.get(eventName);
    if (!handlers) return;
    handlers.delete(handler as EventHandler);
    if (handlers.size === 0) this.handlers.delete(eventName);
  }

  getHandlers(eventName: string): EventHandler[] {
    return [...(this.handlers.get(eventName) ?? [])];
  }
}
