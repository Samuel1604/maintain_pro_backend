import type { QueueJob } from "./queue.job.js";
import type { QueueWorker } from "./worker.js";
import type { Logger } from "../logging/logger.interface.js";

export class QueueWorkerRegistry {
  private readonly workers = new Map<string, QueueWorker>();

  constructor(private readonly logger: Logger) {}

  public registeredJobNames(): string[] {
    return [...this.workers.keys()];
  }

  public registerWorker(jobName: string, worker: QueueWorker): void {
    const replaced = this.workers.has(jobName);
    this.workers.set(jobName, worker);

    this.logger.debug?.("[QueueWorkerRegistry] Worker registered", {
      jobName,
      worker: worker.constructor.name,
      registration: replaced ? "replaced" : "added",
    });
  }

  public async execute<T>(job: QueueJob<T>): Promise<void> {
    const worker = this.workers.get(job.name) as QueueWorker<T> | undefined;

    if (!worker) {
      this.logger.warn("[QueueWorkerRegistry] No worker registered. Job failed and will be retried.", {
        jobName: job.name,
        eventId: job.eventId,
        eventName: job.eventName ?? job.name,
        jobId: job.jobId,
        correlationId: job.correlationId,
        causationId: job.causationId,
      });
      throw new Error(`No worker registered for queue job: ${job.name}`);
    }

    try {
      await worker.execute(job);
    } catch (error) {
      this.logger.error("[QueueWorkerRegistry] Worker failed.", {
        jobName: job.name,
        worker: worker.constructor.name,
        eventId: job.eventId,
        eventName: job.eventName ?? job.name,
        jobId: job.jobId,
        queue: job.queueName,
        correlationId: job.correlationId,
        causationId: job.causationId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }
}
