import type { QueueJob } from "@/infrastructure/queue/queue.job.js";
import type { QueueWorker } from "@/infrastructure/queue/worker.js";
import { EventDispatcher } from "./event.dispatcher.js";
import type { EventRegistry } from "../registry/event.registry.js";
import { RehydratedDomainEvent, type SerializedDomainEvent } from "../bus/serialized-domain-event.js";
import type { Logger } from "@/infrastructure/logging/logger.interface.js";
import { ProcessedEventRepository } from "../idempotency/processed-event.repository.js";

export class DomainEventWorker implements QueueWorker<SerializedDomainEvent> {
  private readonly dispatcher: EventDispatcher;

  constructor(registry: EventRegistry, logger?: Logger, private readonly processedEvents = new ProcessedEventRepository()) {
    this.dispatcher = new EventDispatcher(registry, logger);
  }

  async execute(job: QueueJob<SerializedDomainEvent>): Promise<void> {
    const event = new RehydratedDomainEvent(job.payload);
    const handlers = this.dispatcher.handlersFor(event);
    if (handlers.length === 0) throw new Error(`No handlers registered for domain event: ${event.name}`);
    for (const handler of handlers) {
      const consumerName = handler.constructor.name;
      const claimedConsumer = await this.processedEvents.claim({ eventId: event.eventId, consumerName, jobId: job.jobId, queue: job.queueName, eventName: event.name, correlationId: event.correlationId, causationId: event.causationId });
      if (!claimedConsumer) continue;
      try {
        await handler.handle(event);
        await this.processedEvents.complete(event.eventId, consumerName);
      } catch (error) {
        await this.processedEvents.fail(event.eventId, error, consumerName);
        throw error;
      }
    }
  }
}
