import type { QueueJob } from "./queue.job.js";

export interface QueueService {
  dispatch<T>(job: QueueJob<T>): Promise<void>;
  process<T>(job: QueueJob<T>): Promise<void>;
  close?(): Promise<void>;
}

export interface QueueProducer {
  enqueue<T>(job: QueueJob<T>): Promise<string | undefined>;
  close?(): Promise<void>;
}

export interface QueueProvider extends QueueService, QueueProducer {}
