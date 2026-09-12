import type { QueueWorker } from "../worker.js";
import type { QueueJob } from "../queue.job.js";
import type { Logger } from "../../logging/logger.interface.js";
import type { EmailService } from "@/modules/email/email.service.js";
import type { SendLoginNotificationPayload } from "../jobs/send-login-notification.job.js";

/**
 * LoginNotificationWorker
 *
 * Executes the SendLoginNotificationJob by sending a security-awareness
 * email to the user after a successful login.
 *
 * Rules enforced:
 * - No domain events published.
 * - No authentication performed.
 * - No business validation.
 * - Idempotent: re-sending the login notification email is safe.
 */
export class LoginNotificationWorker
  implements QueueWorker<SendLoginNotificationPayload>
{
  constructor(
    private readonly emailService: EmailService,
    private readonly logger: Logger,
  ) {}

  async execute(job: QueueJob<SendLoginNotificationPayload>): Promise<void> {
    const { email, ipAddress, userAgent } = job.payload;

    this.logger.info("[LoginNotificationWorker] Started", {
      jobName: job.name,
      email,
    });

    try {
      await this.emailService.sendLoginNotificationEmail({ email, ipAddress, userAgent });

      this.logger.info("[LoginNotificationWorker] Completed", {
        jobName: job.name,
        email,
      });
    } catch (error) {
      this.logger.error("[LoginNotificationWorker] Failed", {
        jobName: job.name,
        email,
        error,
      });

      throw error;
    }
  }
}
