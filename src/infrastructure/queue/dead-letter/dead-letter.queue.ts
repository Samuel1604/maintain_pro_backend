import type { QueueJob } from "../queue.job.js";
import { Queue } from "bullmq";
import type { ConnectionOptions, Job } from "bullmq";
import { QUEUE_NAMES, queueConfigs } from "../queue.config.js";
import type { Logger } from "@/infrastructure/logging/logger.interface.js";

export interface DeadLetterRecord {
  dlqId: string;
  originalQueue: string;
  originalJobId?: string;
  eventId?: string;
  eventName?: string;
  organizationId?: string;
  facilityId?: string;
  vendorId?: string;
  jobName: string;
  payload: unknown;
  error: { name: string; message: string; stack?: string };
  attemptsMade: number;
  failedAt: string;
  createdAt: string;
  correlationId?: string;
  causationId?: string;
  replayCount: number;
}

export class DeadLetterQueue {
  private readonly queue: Queue<DeadLetterRecord>;

  constructor(private readonly connection: ConnectionOptions, private readonly logger?: Logger) {
    this.queue = new Queue(QUEUE_NAMES.EVENTS_DLQ, { connection });
  }

  async capture(queueName: string, job: QueueJob, error: Error, attemptsMade = 0, originalJobId?: string): Promise<string | undefined> {
    const record: DeadLetterRecord = {
      dlqId: `${job.eventId ?? originalJobId ?? job.jobId ?? job.name}:${Date.now()}`,
      originalQueue: queueName,
      originalJobId: originalJobId ?? job.jobId,
      eventId: job.eventId,
      eventName: job.eventName ?? job.name,
      organizationId: job.organizationId,
      facilityId: job.facilityId,
      vendorId: job.vendorId,
      jobName: job.name,
      payload: job.payload,
      error: { name: error.name, message: error.message, stack: error.stack },
      attemptsMade,
      failedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      correlationId: job.correlationId,
      causationId: job.causationId,
      replayCount: 0,
    };
    const added = await this.queue.add("dead-letter", record, { jobId: record.dlqId, removeOnComplete: false });
    this.logger?.error("[Queue] Job moved to dead-letter queue", { dlqId: record.dlqId, queue: queueName, jobId: originalJobId, eventId: job.eventId, eventName: record.eventName, correlationId: job.correlationId, causationId: job.causationId, attempts: attemptsMade, error: error.message });
    return added.id;
  }

  async list(limit = 50): Promise<DeadLetterRecord[]> {
    const jobs = await this.queue.getJobs(["waiting", "delayed", "failed", "completed"], 0, Math.max(0, limit - 1));
    return jobs.map((job) => job.data);
  }

  async inspect(dlqId: string): Promise<DeadLetterRecord | undefined> {
    const job = await this.queue.getJob(dlqId);
    return job?.data;
  }

  async close(): Promise<void> { await this.queue.close(); }

  async getJob(dlqId: string): Promise<Job<DeadLetterRecord> | undefined> { return this.queue.getJob(dlqId); }

  getQueue(): Queue<DeadLetterRecord> { return this.queue; }

  async replay(dlqId: string, maxReplayAttempts = 3): Promise<string> {
    const deadLetter = await this.queue.getJob(dlqId);
    if (!deadLetter) throw new Error(`DLQ job not found: ${dlqId}`);
    const record = deadLetter.data;
    if (record.replayCount >= maxReplayAttempts) throw new Error(`DLQ replay limit reached for ${dlqId}`);
    const original = new Queue(record.originalQueue, { connection: this.connection, defaultJobOptions: queueConfigs[record.originalQueue as keyof typeof queueConfigs]?.defaultJobOptions });
    const replayCount = record.replayCount + 1;
    const jobId = `${record.eventId ?? record.originalJobId ?? record.jobName}:replay:${replayCount}`;
    const added = await original.add(record.jobName, {
      name: record.jobName, eventId: record.eventId, eventName: record.eventName, correlationId: record.correlationId,
      causationId: record.causationId, organizationId: record.organizationId, facilityId: record.facilityId, vendorId: record.vendorId, queueName: record.originalQueue, jobId, payload: record.payload,
    }, { jobId });
    await deadLetter.updateData({ ...record, replayCount });
    await original.close();
    this.logger?.info("[Queue] DLQ job replayed", { dlqId, jobId, queue: record.originalQueue, eventId: record.eventId, eventName: record.eventName, replayCount });
    return String(added.id);
  }
}
