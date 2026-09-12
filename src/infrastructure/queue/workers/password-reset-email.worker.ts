import type { QueueWorker } from "../worker.js";
import type { QueueJob } from "../queue.job.js";
import type { Logger } from "../../logging/logger.interface.js";
import type { EmailService } from "@/modules/email/email.service.js";
import type { SendPasswordResetEmailPayload } from "../jobs/send-password-reset-email.job.js";

/**
 * PasswordResetEmailWorker
 *
 * Executes the SendPasswordResetEmailJob by calling EmailService.
 *
 * Rules enforced:
 * - No domain events published.
 * - No authentication performed.
 * - No business validation.
 * - Idempotent: re-sending the same email is safe.
 */
export class PasswordResetEmailWorker
  implements QueueWorker<SendPasswordResetEmailPayload>
{
  constructor(
    private readonly emailService: EmailService,
    private readonly logger: Logger,
  ) {}

  async execute(
    job: QueueJob<SendPasswordResetEmailPayload>,
  ): Promise<void> {
    const { email } = job.payload;

    this.logger.info("[PasswordResetEmailWorker] Started", {
      jobName: job.name,
      email,
    });

    try {
      await this.emailService.send({
        to: email,
        subject: "Reset your password",
        html: `
          <div>
            <p>We received a password reset request for <strong>${email}</strong>.</p>
            <p>If you did not request this, please contact support immediately.</p>
          </div>
        `,
      });

      this.logger.info("[PasswordResetEmailWorker] Completed", {
        jobName: job.name,
        email,
      });
    } catch (error) {
      this.logger.error("[PasswordResetEmailWorker] Failed", {
        jobName: job.name,
        email,
        error,
      });

      throw error;
    }
  }
}
