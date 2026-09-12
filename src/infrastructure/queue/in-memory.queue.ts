import type { QueueService } from "./queue.interface.js";
import type { QueueJob } from "./queue.job.js";
import type { Logger } from "../logging/logger.interface.js";
import type { QueueWorkerRegistry } from "./queue.registry.js";
import { randomUUID } from "node:crypto";

/** Synchronous queue driver for development and tests. */
export class InMemoryQueueService implements QueueService {
  constructor(
    private readonly logger: Logger,
    private readonly registry: QueueWorkerRegistry,
  ) {}

  async dispatch<T>(job: QueueJob<T>): Promise<void> {
    const jobId = job.jobId ?? randomUUID();
    const normalized: QueueJob<T> = {
      ...job,
      jobId,
      eventName: job.eventName ?? job.name,
      correlationId: job.correlationId ?? jobId,
    };
    this.logger.info("[Queue] Job dispatched", {
      name: normalized.name,
      eventId: normalized.eventId,
      eventName: normalized.eventName,
      jobId: normalized.jobId,
      correlationId: normalized.correlationId,
      causationId: normalized.causationId,
    });

    // In-memory: process synchronously (simulates a queue with a single consumer).
    await this.process(normalized);
  }

  async enqueue<T>(job: QueueJob<T>): Promise<string | undefined> {
    const jobId = job.jobId ?? randomUUID();
    await this.dispatch({ ...job, jobId });
    return jobId;
  }

  async process<T>(job: QueueJob<T>): Promise<void> {
    this.logger.debug?.("[Queue] Processing job", { name: job.name });

    await this.registry.execute(job);
  }
}
