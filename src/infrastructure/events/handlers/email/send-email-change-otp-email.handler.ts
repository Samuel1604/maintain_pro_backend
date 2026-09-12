import type { DomainEvent } from "@/infrastructure/events/bus/domain-event.js";
import type { EventHandler } from "@/infrastructure/events/bus/event-handler.interface.js";
import type { OtpRequestedPayload } from "@/modules/identity/events/identity.event-payloads.js";
import { OtpPurpose } from "@/modules/identity/otp/otp.types.js";
import { EmailService } from "@/modules/email/email.service.js";

export class SendEmailChangeOtpEmailHandler implements EventHandler<DomainEvent<OtpRequestedPayload>> {
  constructor(private readonly emailService: EmailService) {}

  async handle(event: DomainEvent<OtpRequestedPayload>): Promise<void> {
    const { email, otp, purpose } = event.payload;

    if (purpose !== OtpPurpose.EMAIL_CHANGE || !otp) {
      return;
    }

    await this.emailService.sendVerificationEmail({
      email,
      tokenOrOtp: otp,
    });
  }
}
