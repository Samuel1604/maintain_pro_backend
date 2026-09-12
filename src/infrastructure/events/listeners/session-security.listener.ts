import type { DomainEvent } from "@/infrastructure/events/bus/domain-event.js";
import type { EventHandler } from "@/infrastructure/events/bus/event-handler.interface.js";
import { IdentityEvents } from "@/modules/identity/events/identity.events.js";
import type {
  PasswordChangedPayload,
  PasswordResetCompletedPayload,
} from "@/modules/identity/events/identity.event-payloads.js";
import type { SessionService } from "@/modules/identity/session/session.service.js";
import { NotFoundException } from "@/shared/errors/index.js";

/**
 * A password change or reset is a strong signal that any *other* active
 * session should no longer be trusted — e.g. the reset flow exists
 * specifically for "I think someone else has access to my account", and a
 * stolen session must not silently survive the owner regaining control.
 *
 * This mirrors the SecurityListener / AuditLogListener pattern: UserService
 * only publishes PasswordChangedEvent / PasswordResetCompletedEvent, and
 * this listener reacts to it, rather than UserService reaching into
 * SessionService directly (see the "publisher, not a side-effect executor"
 * note atop UserService).
 */
export class SessionSecurityListener implements EventHandler<DomainEvent> {
  constructor(private readonly sessionService: SessionService) {}

  public async handle(event: DomainEvent): Promise<void> {
    switch (event.name) {
      case IdentityEvents.PASSWORD_CHANGED: {
        const payload = event.payload as PasswordChangedPayload;
        await this.revokeAllSessions(payload.userId);
        break;
      }

      case IdentityEvents.PASSWORD_RESET_COMPLETED: {
        const payload = event.payload as PasswordResetCompletedPayload;
        await this.revokeAllSessions(payload.userId);
        break;
      }

      default:
        return;
    }
  }

  private async revokeAllSessions(userId: string): Promise<void> {
    try {
      await this.sessionService.logoutAll(userId);
    } catch (error) {
      // No active sessions to revoke is an expected, non-error state here
      // (e.g. a reset completed for an account with no live session) — not
      // a failure of this listener's job.
      if (error instanceof NotFoundException) {
        return;
      }

      throw error;
    }
  }
}
