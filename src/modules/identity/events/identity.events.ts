export const IdentityEvents = {
  // Organization lifecycle
  ORGANIZATION_REGISTERED: "identity.organization.registered",

  // Vendor lifecycle
  VENDOR_REGISTERED: "identity.vendor.registered",

  // User lifecycle
  USER_REGISTERED: "identity.user.registered",

  // Authentication
  USER_LOGGED_IN: "identity.user.logged_in",

  USER_LOGIN_FAILED: "identity.user.login_failed",

  USER_LOGGED_OUT: "identity.user.logged_out",

  USER_LOCKED_OUT: "identity.user.locked_out",

  // Session lifecycle
  SESSION_CREATED: "identity.session.created",

  SESSION_REVOKED: "identity.session.revoked",

  SESSION_EXPIRED: "identity.session.expired",

  SECURITY_ALERT_RAISED: "identity.security.alert_raised",

  // Verification
  OTP_REQUESTED: "identity.otp.requested",

  OTP_VERIFIED: "identity.otp.verified",

  VERIFICATION_LINK_REQUESTED: "identity.verification_link.requested",

  EMAIL_VERIFIED: "identity.email.verified",

  EMAIL_CHANGED: "identity.email.changed",

  // Password
  PASSWORD_RESET_REQUESTED: "identity.password.reset_requested",

  PASSWORD_RESET_COMPLETED: "identity.password.reset_completed",

  PASSWORD_CHANGED: "identity.password.changed",

  // Invitations
  INVITATION_CREATED: "identity.invitation.created",

  INVITATION_ACCEPTED: "identity.invitation.accepted",

  INVITATION_EXPIRED: "identity.invitation.expired",
} as const;

export type IdentityEventName =
  (typeof IdentityEvents)[keyof typeof IdentityEvents];
