import { QUEUE_NAMES, type QueueName } from "./queue.config.js";
import type { BullMqConsumer } from "./providers/bullmq/consumer.js";
import type { Logger } from "@/infrastructure/logging/logger.interface.js";

const DEFAULT_WORKER_QUEUES: QueueName[] = [
  QUEUE_NAMES.EVENTS,
  QUEUE_NAMES.EMAIL,
  QUEUE_NAMES.NOTIFICATION,
];

function configuredWorkerQueues(): QueueName[] {
  const configured = process.env.WORKER_QUEUES
    ?.split(",")
    .map((queue) => queue.trim())
    .filter(Boolean);

  if (!configured?.length) return DEFAULT_WORKER_QUEUES;

  const validQueues = new Set<string>(Object.values(QUEUE_NAMES));
  const queues = configured.filter((queue): queue is QueueName => validQueues.has(queue));
  if (!queues.length) return DEFAULT_WORKER_QUEUES;
  return [...new Set(queues)];
}

export class QueueWorkerBootstrap {
  constructor(
    private readonly consumer: BullMqConsumer,
    private readonly logger?: Logger,
  ) {}

  start(queueNames: Array<QueueName | string> = configuredWorkerQueues()): void {
    queueNames.forEach((queueName) => {
      this.consumer.start(queueName);
      this.logger?.info("[Queue] Worker started", { queue: queueName });
    });
  }

  async stop(): Promise<void> {
    await this.consumer.close();
  }
}
