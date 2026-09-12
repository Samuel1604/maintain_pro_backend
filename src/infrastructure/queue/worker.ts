import type { QueueJob } from "./queue.job.js";

/** Executes one job type; implementations must be idempotent and delegate failures. */
export interface QueueWorker<TPayload = unknown> {
  execute(job: QueueJob<TPayload>): Promise<void>;
}
