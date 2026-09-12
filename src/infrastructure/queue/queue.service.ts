import type { QueueService } from "./queue.interface.js";
import type { QueueJob } from "./queue.job.js";
import type { QueueWorker } from "./worker.js";
import type { QueueWorkerRegistry } from "./queue.registry.js";

export class QueueDispatcher {
  constructor(
    private readonly queue: QueueService,
    private readonly registry: QueueWorkerRegistry,
  ) {}

  dispatch<T>(job: QueueJob<T>): Promise<void> {
    return this.queue.dispatch(job);
  }

  registerWorker(jobName: string, worker: QueueWorker): void {
    this.registry.registerWorker(jobName, worker);
  }

  registeredJobNames(): string[] {
    return this.registry.registeredJobNames();
  }
}
