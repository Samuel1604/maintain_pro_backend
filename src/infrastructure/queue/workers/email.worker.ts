import type { QueueWorker } from "../worker.js";
import type { QueueJob } from "../queue.job.js";
import type { Logger } from "../../logging/logger.interface.js";
import type { EmailService } from "@/modules/email/email.service.js";
import type { SendEmailJobPayload } from "../jobs/send-email.job.js";

/**
 * EmailWorker
 *
 * Dedicated BullMQ worker for executing asynchronous email dispatches.
 */
export class EmailWorker implements QueueWorker<SendEmailJobPayload> {
  constructor(
    private readonly emailService: EmailService,
    private readonly logger: Logger,
  ) {}

  async execute(job: QueueJob<SendEmailJobPayload>): Promise<void> {
    const { to, subject, html, text, tags, correlationId } = job.payload;
    const recipientStr = typeof to === "string" ? to : to.email;

    this.logger.info("[EmailWorker] Processing async email dispatch", {
      jobName: job.name,
      recipient: recipientStr,
      subject,
    });

    try {
      await this.emailService.send({
        to,
        subject,
        html,
        text,
        tags,
        correlationId,
      });

      this.logger.info("[EmailWorker] Async email dispatched successfully", {
        jobName: job.name,
        recipient: recipientStr,
        subject,
      });
    } catch (error) {
      this.logger.error("[EmailWorker] Async email dispatch failed", {
        jobName: job.name,
        recipient: recipientStr,
        subject,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }
}
