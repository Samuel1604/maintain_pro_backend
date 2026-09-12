import type { DomainEvent } from "../bus/index.js";

export interface EventPublisher {
  publish<TEvent extends DomainEvent>(event: TEvent): Promise<void>;
}
