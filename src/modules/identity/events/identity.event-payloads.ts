import type { AuthProvider } from "@/shared/constants/auth-providers.js";
import { SecurityAlertType } from "@/modules/security/security.types.js";
import type { SessionMetadata } from "@/shared/types/session.types.js";

// =====================================
// ORGANIZATION REGISTERED
// =====================================

export interface OrganizationRegisteredPayload {
  organizationId: string;

  userId: string;

  email: string;

  organizationName: string;

  provider: AuthProvider;
}

// =====================================
// VENDOR REGISTERED
// =====================================

export interface VendorRegisteredPayload {
  vendorId: string;

  userId: string;

  email: string;

  vendorName: string;

  provider: AuthProvider;
}

// =====================================
// USER REGISTERED
// =====================================

/**
 * Fired by UserService itself, once, from inside every `create*` method
 * (org admin, vendor lead, invited user, and their OAuth equivalents).
 *
 * This is the single generic "a user account now exists" signal — kept
 * separate from OrganizationRegisteredEvent / VendorRegisteredEvent, which
 * are the business-context events for *why* the user was created. Consumers
 * that only care about user identity (e.g. provisioning a mailbox, seeding
 * default preferences, a generic admin "new users" feed) should subscribe
 * to this instead of duplicating themselves across every registration path.
 */
export interface UserRegisteredPayload {
  userId: string;

  email: string;

  role: string;

  provider: AuthProvider;

  organizationId?: string;

  vendorId?: string;
}

// =====================================
// USER LOGIN
// =====================================

export interface UserLoggedInPayload {
  userId: string;

  email: string;

  sessionId: string;

  provider: AuthProvider;

  ipAddress?: string;

  userAgent?: string;
}

// =====================================
// LOGIN FAILED
// =====================================

export interface UserLoginFailedPayload {
  email: string;

  provider: AuthProvider;

  reason:
    | "user_not_found"
    | "invalid_password"
    | "account_inactive"
    | "unverified_email";

  ipAddress?: string;

  userAgent?: string;
}

// =====================================
// USER LOGOUT
// =====================================

export interface UserLoggedOutPayload {
  userId: string;

  sessionId: string;

  reason?: string;
}

// =====================================
// USER LOCKED OUT
// =====================================

export interface UserLockedOutPayload {
  userId: string;

  email: string;

  failedLoginAttempts: number;

  /**
   * ISO 8601 string — see the note on EmailVerifiedPayload.verifiedAt for
   * why Date is never the right type for a payload that round-trips
   * through the queue.
   */
  lockedUntil: string;

  sessionMetadata?: SessionMetadata;
}

// =====================================
// SESSION CREATED
// =====================================

export interface SessionCreatedPayload {
  userId: string;

  sessionId: string;

  ipAddress?: string;

  userAgent?: string;
}

// =====================================
// SESSION REVOKED
// =====================================

export interface SessionRevokedPayload {
  userId: string;

  sessionId: string;

  reason?: string;
}

// =====================================
// SESSION EXPIRED
// =====================================

export interface SessionExpiredPayload {
  userId: string;

  sessionId: string;
}

export interface SecurityAlertRaisedPayload {
  userId: string;

  type: SecurityAlertType;

  sessionMetadata?: SessionMetadata;

  metadata?: Record<string, unknown>;
}

// =====================================
// OTP REQUESTED
// =====================================

export interface OtpRequestedPayload {
  userId: string;

  email: string;

  purpose: string;

  otp?: string;
}

// =====================================
// OTP VERIFIED
// =====================================

export interface OtpVerifiedPayload {
  userId: string;

  email: string;

  purpose: string;
}

// =====================================
// VERIFICATION LINK REQUESTED
// =====================================

/**
 * Fired when a verification link is generated (link-based strategy).
 * The verificationUrl contains the raw token embedded in the link.
 * Email listeners read this payload to deliver the link to the user.
 */
export interface VerificationLinkRequestedPayload {
  userId: string;

  email: string;

  purpose: string;

  /** Full URL the user should visit to verify: e.g. https://app.com/verify-email?token=...&email=... */
  verificationUrl: string;
}

// =====================================
// EMAIL VERIFIED
// =====================================

export interface EmailVerifiedPayload {
  userId: string;

  email: string;

  /**
   * ISO 8601 string, not a Date instance.
   *
   * Domain event payloads round-trip through BullMQ/Redis as JSON (see
   * QueuedEventBus -> serializeDomainEvent -> RehydratedDomainEvent), which
   * silently turns any Date into a string on the way out and does NOT turn
   * it back into a Date on the way back in. Typing this field as `Date`
   * would be a lie: every handler that receives this payload after it comes
   * off the queue would actually get a string at runtime. Keeping it typed
   * as `string` here keeps the type honest; use `new Date(verifiedAt)` if a
   * consumer ever needs a Date instance.
   */
  verifiedAt: string;
}

// =====================================
// EMAIL CHANGED
// =====================================

export interface EmailChangedPayload {
  userId: string;

  oldEmail: string;

  newEmail: string;
}

// =====================================
// PASSWORD RESET REQUESTED
// =====================================

export interface PasswordResetRequestedPayload {
  userId: string;

  email: string;

  otp?: string;
}

// =====================================
// PASSWORD RESET COMPLETED
// =====================================

export interface PasswordResetCompletedPayload {
  userId: string;

  email: string;
}

// =====================================
// PASSWORD CHANGED
// =====================================

export interface PasswordChangedPayload {
  userId: string;

  email: string;
}

// =====================================
// INVITATION CREATED
// =====================================

export interface InvitationCreatedPayload {
  invitationId: string;

  organizationId?: string;

  vendorId?: string;

  email: string;

  invitedBy: string;

  role: string;
}

// =====================================
// INVITATION ACCEPTED
// =====================================

export interface InvitationAcceptedPayload {
  invitationId: string;

  userId: string;

  email: string;

  role: string;
}

// =====================================
// INVITATION EXPIRED
// =====================================

export interface InvitationExpiredPayload {
  invitationId: string;

  email: string;
}
