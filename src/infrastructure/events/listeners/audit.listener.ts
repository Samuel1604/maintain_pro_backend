import type { DomainEvent } from "@/infrastructure/events/bus/domain-event.js";
import type { EventHandler } from "@/infrastructure/events/bus/event-handler.interface.js";
import { IdentityEvents } from "@/modules/identity/events/identity.events.js";
import type {
  UserRegisteredPayload,
  UserLoggedInPayload,
  UserLoginFailedPayload,
  UserLoggedOutPayload,
  UserLockedOutPayload,
  SessionCreatedPayload,
  SessionRevokedPayload,
  SecurityAlertRaisedPayload,
  InvitationCreatedPayload,
  InvitationAcceptedPayload,
  OrganizationRegisteredPayload,
  VendorRegisteredPayload,
  PasswordChangedPayload,
  PasswordResetCompletedPayload,
  EmailChangedPayload,
} from "@/modules/identity/events/identity.event-payloads.js";
import { AuditLogService } from "@/modules/audit/audit.service.js";
import { AUDIT_ACTIONS } from "@/modules/audit/audit.types.js";
import { SECURITY_ACTIONS } from "@/modules/audit/actions/security-actions.js";
import { SecurityAlertType } from "@/modules/security/security.types.js";
import { toObjectId } from "@/shared/validators/index.js";

export class AuditLogListener implements EventHandler<DomainEvent> {
  constructor(private readonly auditLogService: AuditLogService) {}

  public async handle(event: DomainEvent): Promise<void> {
    switch (event.name) {
      case IdentityEvents.USER_LOGGED_IN: {
        const payload = event.payload as UserLoggedInPayload;

        await this.auditLogService.log({
          actorType: "user",
          targetUserId: toObjectId(payload.userId),
          action: "login",
          outcome: "success",
          severity: "info",
          entityType: "user",
          entityId: toObjectId(payload.userId),
          sessionMetadata: {
            sessionId: payload.sessionId,
            ipAddress: payload.ipAddress ?? "",
            userAgent: payload.userAgent ?? "",
          },
          metadata: { email: payload.email, provider: payload.provider, eventId: event.eventId },
        });

        break;
      }

      case IdentityEvents.USER_LOGIN_FAILED: {
        const payload = event.payload as UserLoginFailedPayload;

        await this.auditLogService.log({
          actorType: "user",
          action: "login_failed",
          outcome: "failure",
          severity: "warning",
          entityType: "user",
          metadata: {
            reason: payload.reason,
            ipAddress: payload.ipAddress,
            userAgent: payload.userAgent,
            email: payload.email,
            provider: payload.provider,
            eventId: event.eventId,
          },
        });

        break;
      }

      case IdentityEvents.USER_LOGGED_OUT: {
        const payload = event.payload as UserLoggedOutPayload;

        await this.auditLogService.log({
          actorType: "user",
          targetUserId: toObjectId(payload.userId),
          action: "logout",
          outcome: "success",
          severity: "info",
          entityType: "session",
          entityId: toObjectId(payload.sessionId),
          sessionMetadata: {
            sessionId: payload.sessionId,
            ipAddress: "",
            userAgent: "",
          },
          metadata: { eventId: event.eventId },
        });

        break;
      }

      case IdentityEvents.SESSION_CREATED: {
        const payload = event.payload as SessionCreatedPayload;

        await this.auditLogService.log({
          actorType: "user",
          targetUserId: toObjectId(payload.userId),
          action: "session_created",
          outcome: "success",
          severity: "info",
          entityType: "session",
          entityId: toObjectId(payload.sessionId),
          sessionMetadata: {
            sessionId: payload.sessionId,
            ipAddress: payload.ipAddress ?? "",
            userAgent: payload.userAgent ?? "",
          },
        });

        break;
      }

      case IdentityEvents.SESSION_REVOKED: {
        const payload = event.payload as SessionRevokedPayload;

        await this.auditLogService.log({
          actorType: "user",
          targetUserId: toObjectId(payload.userId),
          action: "session_revoked",
          outcome: "success",
          severity: "info",
          entityType: "session",
          entityId: toObjectId(payload.sessionId),
          sessionMetadata: {
            sessionId: payload.sessionId,
            ipAddress: "",
            userAgent: "",
          },
        });

        break;
      }

      case IdentityEvents.SECURITY_ALERT_RAISED: {
        const payload = event.payload as SecurityAlertRaisedPayload;

        const action =
          payload.type === SecurityAlertType.TOKEN_REUSE
            ? SECURITY_ACTIONS.TOKEN_REUSE_DETECTED
            : SECURITY_ACTIONS.SUSPICIOUS_LOGIN;

        await this.auditLogService.log({
          actorType: "user",
          targetUserId: toObjectId(payload.userId),
          action,
          outcome: "failure",
          severity: "critical",
          entityType: payload.sessionMetadata ? "session" : "user",
          sessionMetadata: payload.sessionMetadata,
          metadata: payload.metadata,
        });

        break;
      }

      case IdentityEvents.USER_REGISTERED: {
        const payload = event.payload as UserRegisteredPayload;

        await this.auditLogService.log({
          actorType: "user",
          targetUserId: toObjectId(payload.userId),
          action: AUDIT_ACTIONS.USER_CREATED,
          outcome: "success",
          severity: "info",
          entityType: "user",
          entityId: toObjectId(payload.userId),
          metadata: {
            email: payload.email,
            role: payload.role,
            provider: payload.provider,
          },
        });

        break;
      }

      case IdentityEvents.USER_LOCKED_OUT: {
        const payload = event.payload as UserLockedOutPayload;

        await this.auditLogService.log({
          actorType: "user",
          targetUserId: toObjectId(payload.userId),
          action: SECURITY_ACTIONS.ACCOUNT_LOCKED,
          outcome: "success",
          severity: "warning",
          entityType: "user",
          entityId: toObjectId(payload.userId),
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

        await this.auditLogService.log({
          actorType: "user",
          actorId: toObjectId(payload.userId),
          targetUserId: toObjectId(payload.userId),
          action: AUDIT_ACTIONS.PASSWORD_CHANGED,
          outcome: "success",
          severity: "info",
          entityType: "user",
          entityId: toObjectId(payload.userId),
        });

        break;
      }

      case IdentityEvents.PASSWORD_RESET_COMPLETED: {
        const payload = event.payload as PasswordResetCompletedPayload;

        await this.auditLogService.log({
          actorType: "user",
          actorId: toObjectId(payload.userId),
          targetUserId: toObjectId(payload.userId),
          action: AUDIT_ACTIONS.PASSWORD_RESET,
          outcome: "success",
          severity: "info",
          entityType: "user",
          entityId: toObjectId(payload.userId),
        });

        break;
      }

      case IdentityEvents.EMAIL_CHANGED: {
        const payload = event.payload as EmailChangedPayload;

        await this.auditLogService.log({
          actorType: "user",
          actorId: toObjectId(payload.userId),
          targetUserId: toObjectId(payload.userId),
          action: AUDIT_ACTIONS.EMAIL_CHANGED,
          outcome: "success",
          severity: "info",
          entityType: "user",
          entityId: toObjectId(payload.userId),
          metadata: {
            oldEmail: payload.oldEmail,
            newEmail: payload.newEmail,
          },
        });

        break;
      }

      case IdentityEvents.ORGANIZATION_REGISTERED: {
        const payload = event.payload as OrganizationRegisteredPayload;

        await this.auditLogService.log({
          actorType: "user",
          actorId: toObjectId(payload.userId),
          targetUserId: toObjectId(payload.userId),
          action: AUDIT_ACTIONS.ORGANIZATION_CREATED,
          outcome: "success",
          severity: "info",
          entityType: "organization",
          entityId: toObjectId(payload.organizationId),
          metadata: {
            organizationName: payload.organizationName,
            provider: payload.provider,
          },
        });

        break;
      }

      case IdentityEvents.VENDOR_REGISTERED: {
        const payload = event.payload as VendorRegisteredPayload;

        await this.auditLogService.log({
          actorType: "user",
          actorId: toObjectId(payload.userId),
          targetUserId: toObjectId(payload.userId),
          action: AUDIT_ACTIONS.VENDOR_CREATED,
          outcome: "success",
          severity: "info",
          entityType: "vendor",
          entityId: toObjectId(payload.vendorId),
          metadata: {
            vendorName: payload.vendorName,
            provider: payload.provider,
          },
        });

        break;
      }

      case IdentityEvents.INVITATION_CREATED: {
        const payload = event.payload as InvitationCreatedPayload;

        await this.auditLogService.log({
          actorType: "user",
          actorId: toObjectId(payload.invitedBy),
          action: AUDIT_ACTIONS.INVITATION_CREATED,
          outcome: "success",
          severity: "info",
          entityType: "invitation",
          entityId: toObjectId(payload.invitationId),
          metadata: {
            email: payload.email,
            role: payload.role,
          },
        });

        break;
      }

      case IdentityEvents.INVITATION_ACCEPTED: {
        const payload = event.payload as InvitationAcceptedPayload;

        await this.auditLogService.log({
          actorType: "user",
          targetUserId: toObjectId(payload.userId),
          action: "invitation_accepted",
          outcome: "success",
          severity: "info",
          entityType: "invitation",
          entityId: toObjectId(payload.invitationId),
          metadata: {
            email: payload.email,
            role: payload.role,
          },
        });

        break;
      }

      default:
        return;
    }
  }
}
