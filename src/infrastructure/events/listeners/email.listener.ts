import type { DomainEvent } from "@/infrastructure/events/bus/domain-event.js";
import type { EventHandler } from "@/infrastructure/events/bus/event-handler.interface.js";
import { IdentityEvents } from "@/modules/identity/events/identity.events.js";
import type {
  EmailVerifiedPayload,
  PasswordChangedPayload,
  PasswordResetCompletedPayload,
  UserLockedOutPayload,
  EmailChangedPayload,
} from "@/modules/identity/events/identity.event-payloads.js";
import { EmailService } from "@/modules/email/email.service.js";

export class EmailListener implements EventHandler<DomainEvent> {
  constructor(private readonly emailService: EmailService) {}

  public async handle(event: DomainEvent): Promise<void> {
    switch (event.name) {
      case IdentityEvents.EMAIL_VERIFIED: {
        const payload = event.payload as EmailVerifiedPayload;

        await this.emailService.send({
          to: payload.email,
          subject: "Your email is verified",
          html: `<div><p>Your email <strong>${payload.email}</strong> was successfully verified.</p><p>If this was not you, please contact support.</p></div>`,
        });

        break;
      }

      case IdentityEvents.PASSWORD_CHANGED: {
        const payload = event.payload as PasswordChangedPayload;

        await this.emailService.send({
          to: payload.email,
          subject: "Your password has changed",
          html: `<div><p>Your password for <strong>${payload.email}</strong> was changed successfully.</p><p>If you did not make this change, please reset your password immediately.</p></div>`,
        });

        break;
      }

      case IdentityEvents.PASSWORD_RESET_COMPLETED: {
        const payload = event.payload as PasswordResetCompletedPayload;

        await this.emailService.send({
          to: payload.email,
          subject: "Your password has been reset",
          html: `<div><p>The password for <strong>${payload.email}</strong> was just reset.</p><p>If you did not request this, please contact support immediately.</p></div>`,
        });

        break;
      }

      case IdentityEvents.USER_LOCKED_OUT: {
        const payload = event.payload as UserLockedOutPayload;

        await this.emailService.send({
          to: payload.email,
          subject: "Your account has been temporarily locked",
          html: `<div><p>We locked your account after several failed sign-in attempts.</p><p>You can try again after a short cooldown period. If this wasn't you, please contact support.</p></div>`,
        });

        break;
      }

      case IdentityEvents.EMAIL_CHANGED: {
        const payload = event.payload as EmailChangedPayload;

        // Notify the OLD address — it's the one that can still tell us
        // this change wasn't authorized.
        await this.emailService.send({
          to: payload.oldEmail,
          subject: "Your email address was changed",
          html: `<div><p>The email on your account was changed from <strong>${payload.oldEmail}</strong> to <strong>${payload.newEmail}</strong>.</p><p>If you did not make this change, please contact support immediately.</p></div>`,
        });

        break;
      }

      // NOTE: IdentityEvents.INVITATION_CREATED is intentionally NOT handled here.
      // InvitationService.create() already sends the invitation email directly
      // (it's the only place that has the real invite token/link). Handling this
      // event here as well previously caused a duplicate, link-less email to be
      // sent alongside the real one. See QueueListener for the same note.

      default:
        return;
    }
  }
}
