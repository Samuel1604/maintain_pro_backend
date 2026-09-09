import type { QueueProducer } from "@/infrastructure/queue/queue.interface.js";
import { QUEUE_NAMES } from "@/infrastructure/queue/queue.config.js";
import { DOMAIN_EVENT_DISPATCH_JOB } from "@/infrastructure/events/bus/queued-event-bus.js";
import type { Logger } from "@/infrastructure/logging/logger.interface.js";
import { OutboxEventRepository } from "./outbox-event.repository.js";

const MAX_ATTEMPTS = 8;

/** Relays committed outbox rows to BullMQ without losing failed deliveries. */
export class OutboxEventWorker {
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly producer: QueueProducer,
    private readonly repository = new OutboxEventRepository(),
    private readonly logger?: Logger,
  ) {}

  async runOnce(): Promise<boolean> {
    const event = await this.repository.claimNext();
    if (!event) return false;

    try {
      await this.producer.enqueue({
        name: DOMAIN_EVENT_DISPATCH_JOB,
        eventId: event.eventId,
        eventName: event.eventType,
        queueName: QUEUE_NAMES.EVENTS,
        jobId: event.eventId,
        correlationId: event.eventId,
        payload: event.payload,
      });
      await this.repository.markPublished(event.eventId);
      return true;
    } catch (error) {
      const attempts = event.attempts;
      const deadLetter = attempts >= MAX_ATTEMPTS;
      const retryAt = new Date(Date.now() + Math.min(300_000, 2_000 * 2 ** Math.max(0, attempts - 1)));
      await this.repository.markFailed(event.eventId, error, { retryAt, deadLetter });
      this.logger?.error("[Outbox] Event relay failed", { eventId: event.eventId, attempts, deadLetter, error: String(error) });
      return false;
    }
  }

  start(intervalMs = 1_000): void {
    if (this.timer) return;
    this.running = true;
    this.timer = setInterval(() => {
      if (!this.running) return;
      void this.runOnce().catch((error) => this.logger?.error("[Outbox] Poll failed", { error: String(error) }));
    }, intervalMs);
    this.timer.unref?.();
  }

  stop(): void {
    this.running = false;
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }
}
