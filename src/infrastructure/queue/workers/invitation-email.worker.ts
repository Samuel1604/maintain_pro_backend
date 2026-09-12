import type { QueueWorker } from "../worker.js";
import type { QueueJob } from "../queue.job.js";
import type { Logger } from "../../logging/logger.interface.js";
import type { EmailService } from "@/modules/email/email.service.js";
import type { SendInvitationEmailPayload } from "../jobs/send-invitation-email.job.js";

/**
 * InvitationEmailWorker
 *
 * Executes the SendInvitationEmailJob by calling EmailService.
 *
 * Rules enforced:
 * - No domain events published.
 * - No authentication performed.
 * - No business validation.
 * - Idempotent: re-sending the invitation email is safe.
 */
export class InvitationEmailWorker
  implements QueueWorker<SendInvitationEmailPayload>
{
  constructor(
    private readonly emailService: EmailService,
    private readonly logger: Logger,
  ) {}

  async execute(job: QueueJob<SendInvitationEmailPayload>): Promise<void> {
    const { email, role, invitedBy } = job.payload;

    this.logger.info("[InvitationEmailWorker] Started", {
      jobName: job.name,
      email,
    });

    try {
      await this.emailService.send({
        to: email,
        subject: "You have been invited to MaintainPro",
        html: `
          <div>
            <p>You have been invited to join as <strong>${role}</strong> by <strong>${invitedBy}</strong>.</p>
            <p>Use the invitation link sent separately to complete your registration.</p>
          </div>
        `,
      });

      this.logger.info("[InvitationEmailWorker] Completed", {
        jobName: job.name,
        email,
      });
    } catch (error) {
      this.logger.error("[InvitationEmailWorker] Failed", {
        jobName: job.name,
        email,
        error,
      });

      throw error;
    }
  }
}
