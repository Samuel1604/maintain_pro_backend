import { Queue } from "bullmq";
import type { ConnectionOptions } from "bullmq";
import { queueConfigs, type QueueName } from "./queue.config.js";
import type { DeadLetterQueue } from "./dead-letter/dead-letter.queue.js";

export class QueueHealthService {
  constructor(private readonly connection: ConnectionOptions, private readonly deadLetterQueue?: DeadLetterQueue) {}

  async get(queueName: QueueName | string) {
    const queue = new Queue(queueName, { connection: this.connection });
    const counts = await queue.getJobCounts("wait", "active", "completed", "failed", "delayed");
    await queue.close();
    return { queue: queueName, concurrency: queueConfigs[queueName as QueueName]?.concurrency, ...counts, dlqCount: queueName === "domain-events" && this.deadLetterQueue ? (await this.deadLetterQueue.list(1000)).length : undefined };
  }
}
