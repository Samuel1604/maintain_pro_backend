import type { DomainEvent } from "@/infrastructure/events/bus/domain-event.js";
import type { EventHandler } from "@/infrastructure/events/bus/event-handler.interface.js";
import type { PasswordResetRequestedPayload } from "@/modules/identity/events/identity.event-payloads.js";
import { EmailService } from "@/modules/email/email.service.js";

export class SendPasswordResetEmailHandler implements EventHandler<DomainEvent<PasswordResetRequestedPayload>> {
  constructor(private readonly emailService: EmailService) {}

  async handle(event: DomainEvent<PasswordResetRequestedPayload>): Promise<void> {
    const { email, otp } = event.payload;

    if (!otp) {
      return;
    }

    await this.emailService.sendPasswordResetOtp(email, otp);
  }
}
