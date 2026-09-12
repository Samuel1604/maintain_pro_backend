import type { DomainEvent } from "@/infrastructure/events/bus/domain-event.js";
import type { EventHandler } from "@/infrastructure/events/bus/event-handler.interface.js";
import { IdentityEvents } from "@/modules/identity/events/identity.events.js";
import type {
  SecurityAlertRaisedPayload,
  UserLockedOutPayload,
  PasswordChangedPayload,
  PasswordResetCompletedPayload,
  EmailChangedPayload,
} from "@/modules/identity/events/identity.event-payloads.js";
import type { SecurityService } from "@/modules/security/security.service.js";
import { SecurityAlertType } from "@/modules/security/security.types.js";
import { toObjectId } from "@/shared/validators/index.js";

export class SecurityListener implements EventHandler<DomainEvent> {
  constructor(private readonly securityService: SecurityService) {}

  public async handle(event: DomainEvent): Promise<void> {
    switch (event.name) {
      case IdentityEvents.SECURITY_ALERT_RAISED: {
        const payload = event.payload as SecurityAlertRaisedPayload;

        await this.securityService.createAlert({
          userId: toObjectId(payload.userId),
          type: payload.type,
          sessionMetadata: payload.sessionMetadata,
          metadata: payload.metadata,
        });

        break;
      }

      case IdentityEvents.USER_LOCKED_OUT: {
        const payload = event.payload as UserLockedOutPayload;

        await this.securityService.createAlert({
          userId: toObjectId(payload.userId),
          type: SecurityAlertType.ACCOUNT_LOCKED,
          sessionMetadata: payload.sessionMetadata,
          metadata: {
            failedLoginAttempts: payload.failedLoginAttempts,
            lockedUntil: payload.lockedUntil,
          },
        });

        break;
      }

      case IdentityEvents.PASSWORD_CHANGED: {
        const payload = event.payload as PasswordChangedPayload;

        await this.securityService.createAlert({
          userId: toObjectId(payload.userId),
          type: SecurityAlertType.PASSWORD_CHANGED,
          metadata: {
            method: "manual",
          },
        });

        break;
      }

      case IdentityEvents.PASSWORD_RESET_COMPLETED: {
        const payload = event.payload as PasswordResetCompletedPayload;

        await this.securityService.createAlert({
          userId: toObjectId(payload.userId),
          type: SecurityAlertType.PASSWORD_RESET,
        });

        break;
      }

      case IdentityEvents.EMAIL_CHANGED: {
        const payload = event.payload as EmailChangedPayload;

        await this.securityService.createAlert({
          userId: toObjectId(payload.userId),
          type: SecurityAlertType.EMAIL_CHANGED,
          metadata: {
            oldEmail: payload.oldEmail,
            newEmail: payload.newEmail,
          },
        });

        break;
      }

      default:
        return;
    }
  }
}
