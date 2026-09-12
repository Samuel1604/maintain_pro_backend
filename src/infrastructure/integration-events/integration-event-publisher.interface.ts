import type { IntegrationEvent } from "@/infrastructure/events/bus/integration-event.js";

export interface IntegrationEventPublisher {
  publish<TEvent extends IntegrationEvent>(event: TEvent): Promise<void>;
  close?(): Promise<void>;
}
