import { QUEUE_NAMES, type QueueName } from "./queue.config.js";
import type { BullMqConsumer } from "./providers/bullmq/consumer.js";
import type { Logger } from "@/infrastructure/logging/logger.interface.js";

const DEFAULT_WORKER_QUEUES: QueueName[] = [
  QUEUE_NAMES.EVENTS,
  QUEUE_NAMES.EMAIL,
  QUEUE_NAMES.NOTIFICATION,
  QUEUE_NAMES.AUDIT,
  QUEUE_NAMES.ANALYTICS,
  QUEUE_NAMES.MARKETPLACE,
  QUEUE_NAMES.BILLING,
  QUEUE_NAMES.AI,
  QUEUE_NAMES.REPORTS,
];

export class QueueWorkerBootstrap {
  constructor(
    private readonly consumer: BullMqConsumer,
    private readonly logger?: Logger,
  ) {}

  start(queueNames: Array<QueueName | string> = DEFAULT_WORKER_QUEUES): void {
    queueNames.forEach((queueName) => {
      this.consumer.start(queueName);
      this.logger?.info("[Queue] Worker started", { queue: queueName });
    });
  }

  async stop(): Promise<void> {
    await this.consumer.close();
  }
}
