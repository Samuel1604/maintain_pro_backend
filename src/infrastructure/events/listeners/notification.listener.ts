import type { DomainEvent } from "@/infrastructure/events/bus/domain-event.js";
import type { EventHandler } from "@/infrastructure/events/bus/event-handler.interface.js";
import { QueueDispatcher } from "@/infrastructure/queue/queue.service.js";

export class NotificationListener implements EventHandler<DomainEvent> {
  constructor(private readonly queueDispatcher: QueueDispatcher) {}

  public async handle(event: DomainEvent): Promise<void> {
    await this.queueDispatcher.dispatch({
      name: `notification.${event.name}`,
      payload: event.payload,
    });
  }
}
