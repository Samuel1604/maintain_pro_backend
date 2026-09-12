import { DomainEvent } from "@/infrastructure/events/bus/domain-event.js";
import { IdentityEvents } from "./identity.events.js";
import type {
  OrganizationRegisteredPayload,
  VendorRegisteredPayload,
  UserRegisteredPayload,
  UserLoggedInPayload,
  UserLoginFailedPayload,
  UserLockedOutPayload,
  SessionCreatedPayload,
  SessionRevokedPayload,
  SessionExpiredPayload,
  SecurityAlertRaisedPayload,
  OtpRequestedPayload,
  OtpVerifiedPayload,
  VerificationLinkRequestedPayload,
  EmailVerifiedPayload,
  EmailChangedPayload,
  UserLoggedOutPayload,
  PasswordChangedPayload,
  PasswordResetRequestedPayload,
  PasswordResetCompletedPayload,
  InvitationCreatedPayload,
  InvitationAcceptedPayload,
  InvitationExpiredPayload,
} from "./identity.event-payloads.js";

// =====================================
// ORGANIZATION REGISTERED EVENT
// =====================================

export class OrganizationRegisteredEvent extends DomainEvent<OrganizationRegisteredPayload> {
  constructor(payload: OrganizationRegisteredPayload) {
    super(IdentityEvents.ORGANIZATION_REGISTERED, payload);
  }
}

// =====================================
// VENDOR REGISTERED EVENT
// =====================================

export class VendorRegisteredEvent extends DomainEvent<VendorRegisteredPayload> {
  constructor(payload: VendorRegisteredPayload) {
    super(IdentityEvents.VENDOR_REGISTERED, payload);
  }
}

// =====================================
// USER REGISTERED EVENT
// =====================================

export class UserRegisteredEvent extends DomainEvent<UserRegisteredPayload> {
  constructor(payload: UserRegisteredPayload) {
    super(IdentityEvents.USER_REGISTERED, payload);
  }
}

// =====================================
// USER LOGGED IN EVENT
// =====================================

export class UserLoggedInEvent extends DomainEvent<UserLoggedInPayload> {
  constructor(payload: UserLoggedInPayload) {
    super(IdentityEvents.USER_LOGGED_IN, payload);
  }
}

// =====================================
// USER LOGIN FAILED EVENT
// =====================================

export class UserLoginFailedEvent extends DomainEvent<UserLoginFailedPayload> {
  constructor(payload: UserLoginFailedPayload) {
    super(IdentityEvents.USER_LOGIN_FAILED, payload);
  }
}

//
//
//

export class UserLoggedOutEvent extends DomainEvent<UserLoggedOutPayload> {
  constructor(payload: UserLoggedOutPayload) {
    super(IdentityEvents.USER_LOGGED_OUT, payload);
  }
}

// =====================================
// USER LOCKED OUT EVENT
// =====================================

export class UserLockedOutEvent extends DomainEvent<UserLockedOutPayload> {
  constructor(payload: UserLockedOutPayload) {
    super(IdentityEvents.USER_LOCKED_OUT, payload);
  }
}

// =====================================
// SESSION CREATED EVENT
// =====================================

export class SessionCreatedEvent extends DomainEvent<SessionCreatedPayload> {
  constructor(payload: SessionCreatedPayload) {
    super(IdentityEvents.SESSION_CREATED, payload);
  }
}

// =====================================
// SESSION REVOKED EVENT
// =====================================

export class SessionRevokedEvent extends DomainEvent<SessionRevokedPayload> {
  constructor(payload: SessionRevokedPayload) {
    super(IdentityEvents.SESSION_REVOKED, payload);
  }
}

// =====================================
// SESSION EXPIRED EVENT
// =====================================

export class SessionExpiredEvent extends DomainEvent<SessionExpiredPayload> {
  constructor(payload: SessionExpiredPayload) {
    super(IdentityEvents.SESSION_EXPIRED, payload);
  }
}

export class SecurityAlertRaisedEvent extends DomainEvent<SecurityAlertRaisedPayload> {
  constructor(payload: SecurityAlertRaisedPayload) {
    super(IdentityEvents.SECURITY_ALERT_RAISED, payload);
  }
}

// =====================================
// OTP REQUESTED EVENT
// =====================================

export class OtpRequestedEvent extends DomainEvent<OtpRequestedPayload> {
  constructor(payload: OtpRequestedPayload) {
    super(IdentityEvents.OTP_REQUESTED, payload);
  }
}

// =====================================
// OTP VERIFIED EVENT
// =====================================

export class OtpVerifiedEvent extends DomainEvent<OtpVerifiedPayload> {
  constructor(payload: OtpVerifiedPayload) {
    super(IdentityEvents.OTP_VERIFIED, payload);
  }
}

// =====================================
// VERIFICATION LINK REQUESTED EVENT
// =====================================

export class VerificationLinkRequestedEvent extends DomainEvent<VerificationLinkRequestedPayload> {
  constructor(payload: VerificationLinkRequestedPayload) {
    super(IdentityEvents.VERIFICATION_LINK_REQUESTED, payload);
  }
}

// =====================================
// EMAIL VERIFIED EVENT
// =====================================

export class EmailVerifiedEvent extends DomainEvent<EmailVerifiedPayload> {
  constructor(payload: EmailVerifiedPayload) {
    super(IdentityEvents.EMAIL_VERIFIED, payload);
  }
}

export class EmailChangedEvent extends DomainEvent<EmailChangedPayload> {
  constructor(payload: EmailChangedPayload) {
    super(IdentityEvents.EMAIL_CHANGED, payload);
  }
}

export class PasswordResetRequestedEvent extends DomainEvent<PasswordResetRequestedPayload> {
  constructor(payload: PasswordResetRequestedPayload) {
    super(IdentityEvents.PASSWORD_RESET_REQUESTED, payload);
  }
}

export class PasswordResetCompletedEvent extends DomainEvent<PasswordResetCompletedPayload> {
  constructor(payload: PasswordResetCompletedPayload) {
    super(IdentityEvents.PASSWORD_RESET_COMPLETED, payload);
  }
}

export class PasswordChangedEvent extends DomainEvent<PasswordChangedPayload> {
  constructor(payload: PasswordChangedPayload) {
    super(IdentityEvents.PASSWORD_CHANGED, payload);
  }
}

export class InvitationCreatedEvent extends DomainEvent<InvitationCreatedPayload> {
  constructor(payload: InvitationCreatedPayload) {
    super(IdentityEvents.INVITATION_CREATED, payload);
  }
}

export class InvitationAcceptedEvent extends DomainEvent<InvitationAcceptedPayload> {
  constructor(payload: InvitationAcceptedPayload) {
    super(IdentityEvents.INVITATION_ACCEPTED, payload);
  }
}

export class InvitationExpiredEvent extends DomainEvent<InvitationExpiredPayload> {
  constructor(payload: InvitationExpiredPayload) {
    super(IdentityEvents.INVITATION_EXPIRED, payload);
  }
}
