import type { QueueService } from "../../queue.interface.js";
import type { QueueJob } from "../../queue.job.js";
import type { QueueWorkerRegistry } from "../../queue.registry.js";
import type { BullMqProducer } from "./producer.js";

export class BullMqQueueService implements QueueService {
  constructor(
    private readonly producer: BullMqProducer,
    private readonly registry: QueueWorkerRegistry,
  ) {}

  async dispatch<T>(job: QueueJob<T>): Promise<void> {
    await this.producer.enqueue(job);
  }

  async process<T>(job: QueueJob<T>): Promise<void> {
    await this.registry.execute(job);
  }

  async close(): Promise<void> {
    await this.producer.close();
  }
}
