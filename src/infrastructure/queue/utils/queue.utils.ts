import type { QueueJob } from "../queue.job.js";

export function createQueueJob<T>(job: QueueJob<T>): QueueJob<T> {
  return job;
}

export function isQueueJob(value: unknown): value is QueueJob {
  return Boolean(
    value &&
      typeof value === "object" &&
      "name" in value &&
      typeof (value as QueueJob).name === "string" &&
      "payload" in value,
  );
}
