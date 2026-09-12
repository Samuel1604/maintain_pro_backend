import { Worker } from "bullmq";
import type { ConnectionOptions, Job, Worker as BullWorker } from "bullmq";
import type { QueueService } from "../../queue.interface.js";
import type { QueueJob } from "../../queue.job.js";
import { queueConfigs, type QueueName } from "../../queue.config.js";
import type { Logger } from "@/infrastructure/logging/logger.interface.js";
import { QueueMetrics } from "../../metrics/queue.metrics.js";
import { DeadLetterQueue } from "../../dead-letter/dead-letter.queue.js";

async function withTimeout<T>(task: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      task,
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error(`Queue job timed out after ${timeoutMs}ms`)), timeoutMs); }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export class BullMqConsumer {
  private readonly workers = new Map<string, BullWorker>();

  constructor(
    private readonly connection: ConnectionOptions,
    private readonly queueService: QueueService,
    private readonly logger?: Logger,
    private readonly metrics: QueueMetrics = new QueueMetrics(),
    private readonly deadLetterQueue: DeadLetterQueue = new DeadLetterQueue(connection, logger),
  ) {}

  start(queueName: QueueName | string): void {
    if (this.workers.has(queueName)) return;

    const config = queueConfigs[queueName as QueueName];
    const worker = new Worker(
      queueName,
      async (job: Job<QueueJob>) => this.processJob(queueName, job),
      {
        connection: this.connection,
        concurrency: config?.concurrency ?? 5,
        lockDuration: config?.lockDurationMs ?? 60_000,
        lockRenewTime: config?.lockRenewTimeMs ?? 20_000,
        limiter: config?.limiter,
      },
    );

    worker.on("completed", (job) => {
      this.logger?.info("[Queue] Job completed", {
        eventName: job.data?.eventName ?? job.name,
        queue: queueName,
        jobId: job.id,
        organizationId: job.data?.organizationId,
        facilityId: job.data?.facilityId,
        vendorId: job.data?.vendorId,
      });
    });

    worker.on("failed", async (job, error) => {
      this.logger?.error("[Queue] Job failed", {
        eventName: job?.data?.eventName ?? job?.name,
        queue: queueName,
        jobId: job?.id,
        eventId: job?.data?.eventId,
        organizationId: job?.data?.organizationId,
        facilityId: job?.data?.facilityId,
        vendorId: job?.data?.vendorId,
        correlationId: job?.data?.correlationId,
        causationId: job?.data?.causationId,
        attempts: job?.attemptsMade,
        error: error.message,
      });

      if (job?.attemptsMade && job.opts.attempts && job.attemptsMade >= job.opts.attempts) {
        await this.deadLetterQueue.capture(queueName, job.data, error, job.attemptsMade, job.id);
      }
    });

    worker.on("stalled", async (jobId) => {
      this.logger?.warn("[Queue] Job stalled and will be retried by BullMQ", {
        queue: queueName,
        jobId,
        note: "BullMQ does not expose the stalled job payload from the Worker event; the job ID is retained for inspection.",
      });
    });

    this.workers.set(queueName, worker);
  }

  async close(): Promise<void> {
    await Promise.all([...this.workers.values()].map((worker) => worker.close()));
    this.workers.clear();
  }

  private async processJob(queueName: string, job: Job<QueueJob>): Promise<void> {
    const startedAt = Date.now();
    const envelope: QueueJob = { ...job.data, jobId: job.data.jobId ?? job.id, queueName };

    this.logger?.info("[Queue] Processing job", {
      eventName: job.data.eventName ?? job.data.name ?? job.name,
      queue: queueName,
      jobId: job.id,
      correlationId: job.data.correlationId,
      causationId: job.data.causationId,
      eventId: job.data.eventId,
      organizationId: job.data.organizationId,
      facilityId: job.data.facilityId,
      vendorId: job.data.vendorId,
    });

    try {
      const timeoutMs = queueConfigs[queueName as QueueName]?.workerTimeoutMs ?? 30_000;
      await withTimeout(this.queueService.process(envelope), timeoutMs);
      const durationMs = Date.now() - startedAt;
      this.metrics.recordSuccess(queueName, envelope.name, durationMs);
      this.logger?.info("[Queue] Job processed successfully", {
        eventName: job.data.eventName ?? job.data.name ?? job.name,
        queue: queueName,
        jobId: job.id,
        organizationId: job.data.organizationId,
        facilityId: job.data.facilityId,
        vendorId: job.data.vendorId,
        durationMs,
        success: true,
      });
    } catch (error) {
      const durationMs = Date.now() - startedAt;
      this.metrics.recordFailure(queueName, envelope.name, durationMs);
      this.logger?.error("[Queue] Job processing failed", {
        eventName: job.data.eventName ?? job.data.name ?? job.name,
        queue: queueName,
        jobId: job.id,
        organizationId: job.data.organizationId,
        facilityId: job.data.facilityId,
        vendorId: job.data.vendorId,
        durationMs,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }
}
