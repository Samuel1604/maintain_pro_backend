import type { QueueJob } from "../../queue.job.js";
import type { QueueProducer } from "../../queue.interface.js";
import { QUEUE_NAMES } from "../../queue.config.js";
import type { BullMqQueueFactory } from "./queue.factory.js";
import type { Logger } from "@/infrastructure/logging/logger.interface.js";
import { randomUUID } from "node:crypto";

export class BullMqProducer implements QueueProducer {
  constructor(
    private readonly factory: BullMqQueueFactory,
    private readonly logger?: Logger,
  ) {}

  async enqueue<T>(job: QueueJob<T>): Promise<string | undefined> {
    const queueName = job.queueName ?? QUEUE_NAMES.EVENTS;
    const queue = this.factory.getQueue(queueName);
    const jobId = job.jobId ?? randomUUID();
    const envelope: QueueJob<T> = {
      ...job,
      jobId,
      eventName: job.eventName ?? job.name,
      correlationId: job.correlationId ?? jobId,
    };

    // NOTE: `timeout` is intentionally not passed to BullMQ here.
    //
    // `job.timeoutMs` exists on the QueueJob type, but BullMQ's JobsOptions
    // has no `timeout` field — that was a Bull (v3) option, not a BullMQ
    // one. Passing it silently did nothing; BullMQ jobs are bounded by the
    // Worker's `lockDuration`/stalled-job handling instead, configured per
    // queue in queue.config.ts, not per job. If per-job timeouts are needed,
    // they should be enforced inside the worker's `execute()` (e.g. wrap the
    // work in Promise.race with a timeout), not via a job option here.
    const added = await queue.add(envelope.name, envelope, {
      jobId,
      priority: envelope.priority,
    });

    this.logger?.info("[Queue] Job enqueued", {
      queue: queueName,
      jobId: added.id,
      eventId: envelope.eventId,
      eventName: envelope.eventName,
      organizationId: envelope.organizationId,
      facilityId: envelope.facilityId,
      vendorId: envelope.vendorId,
      correlationId: envelope.correlationId,
      causationId: envelope.causationId,
    });

    return added.id;
  }

  async close(): Promise<void> {
    await this.factory.close();
  }
}
