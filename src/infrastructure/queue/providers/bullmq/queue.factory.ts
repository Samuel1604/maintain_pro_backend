import { Queue } from "bullmq";
import type { Queue as BullQueue, ConnectionOptions } from "bullmq";
import { queueConfigs, type QueueName } from "../../queue.config.js";

export class BullMqQueueFactory {
  private readonly queues = new Map<string, BullQueue>();

  constructor(private readonly connection: ConnectionOptions) {}

  getQueue(queueName: QueueName | string): BullQueue {
    const existing = this.queues.get(queueName);
    if (existing) return existing;

    const config = queueConfigs[queueName as QueueName];
    const queue = new Queue(queueName, {
      connection: this.connection,
      defaultJobOptions: config?.defaultJobOptions,
    });

    this.queues.set(queueName, queue);
    return queue;
  }

  async close(): Promise<void> {
    await Promise.all([...this.queues.values()].map((queue) => queue.close()));
    this.queues.clear();
  }
}
