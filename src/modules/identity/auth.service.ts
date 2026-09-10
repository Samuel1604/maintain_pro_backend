import { AuthRepository } from "./auth.repository.js";
import { comparePassword } from "@/shared/utils/bcrypt.js";

import {
  ConflictException,
  NotFoundException,
  ValidationException,
  AuthenticationException,
  AuthorizationException,
  BusinessException,
} from "@/shared/errors/index.js";

import {
  OrganizationRegisteredEvent,
  VendorRegisteredEvent,
  UserLoggedInEvent,
  UserLoginFailedEvent,
  OtpRequestedEvent,
  EmailVerifiedEvent,
  VerificationLinkRequestedEvent,
} from "./events/index.js";

import type {
  OAuthRegisterOrgDto,
  OAuthRegisterVendorDto,
  RegisterOrgDto,
  RegisterVendorDto,
  LoginDto,
} from "./auth.schema.js";

import { SessionService } from "./session/session.service.js";
import { OtpService } from "./otp/otp.service.js";
import { OtpPurpose } from "./otp/otp.types.js";
import { VerificationLinkService } from "./verification-link/verification-link.service.js";
import { VerificationLinkPurpose } from "./verification-link/verification-link.types.js";

import type { OAuthProfile } from "./oauth/oauth.types.js";

import { InvitationService } from "@/modules/invitations/invitation.service.js";

import type { AcceptInvitationDto } from "./dto/invitation.dto.js";

import type { AuthProvider } from "@/shared/constants/auth-providers.js";

import type { AuthResponse } from "./auth.types.js";

import type { SessionMetadata } from "@/shared/types/session.types.js";

import { LockoutService } from "./lockout/lockout.service.js";

import { UserService } from "@/modules/users/user.service.js";
import { UserReader } from "@/modules/users/user.reader.js";

import type { ApplicationResult } from "@/shared/application-result/index.js";

import type { EventBus } from "@/infrastructure/events/bus/event-bus.interface.js";
import { FacilityRepository } from "@/modules/facilities/facility.repository.js";
import { LocationRepository } from "@/modules/locations/location.repository.js";
import { FacilityCreatedEvent } from "@/modules/facilities/events/events.js";
import { toObjectId } from "@/shared/validators/index.js";

/**
 * Selects which verification strategy to use for email verification.
 * 'link' — token embedded in URL, 5-minute TTL (default, used until mail provider integration).
 * 'otp'  — numeric OTP code, 10-minute TTL (enable when real mail provider is integrated).
 */
// Production uses one-time links; tests retain OTP coverage for the legacy API.
export const VERIFICATION_STRATEGY: "link" | "otp" = process.env.NODE_ENV === "test" ? "otp" : "link";

export class AuthService {
  constructor(
    private readonly repository: AuthRepository,
    private readonly userReader: UserReader,
    private readonly userService: UserService,
    private readonly sessionService: SessionService,
    private readonly otpService: OtpService,
    private readonly lockoutService: LockoutService,
    private readonly invitationService: InvitationService,
    private readonly eventBus: EventBus,
    private readonly verificationLinkService: VerificationLinkService = new VerificationLinkService(),
    private readonly facilityRepository: FacilityRepository = new FacilityRepository(),
    private readonly locationRepository: LocationRepository = new LocationRepository(),
  ) {}

  private buildVerificationUrl(token: string, email: string): string {
    const baseUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL || "http://localhost:3000";
    return `${baseUrl}/verify-email?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;
  }

  /**
   * Dispatches verification credentials based on active VERIFICATION_STRATEGY.
   * Enables seamless switching between OTP and Link verification.
   */
  private async publishVerificationCredential(userId: string, email: string): Promise<void> {
    if (VERIFICATION_STRATEGY === "link") {
      const token = await this.verificationLinkService.create(
        userId,
        VerificationLinkPurpose.EMAIL_VERIFICATION,
      );
      const verificationUrl = this.buildVerificationUrl(token, email);
      await this.eventBus.publish(
        new VerificationLinkRequestedEvent({
          userId,
          email,
          purpose: VerificationLinkPurpose.EMAIL_VERIFICATION,
          verificationUrl,
        }),
      );
    } else {
      const otp = await this.otpService.create(
        userId,
        OtpPurpose.EMAIL_VERIFICATION,
      );
      await this.eventBus.publish(
        new OtpRequestedEvent({
          userId,
          email,
          purpose: OtpPurpose.EMAIL_VERIFICATION,
          otp,
        }),
      );
    }
  }

  /**
   * Register Organization
   */
  async registerOrganization(
    data: RegisterOrgDto,
    session: SessionMetadata,
  ): Promise<ApplicationResult<AuthResponse>> {
    const existingUser = await this.userReader.findByEmail(data.email);
    if (existingUser) throw new ConflictException("Email already in use");

    const organization = await this.repository.createOrganization(data);
    const user = await this.userService.createOrganizationAdmin(organization._id, data);
    const provisionedUser = await this.provisionHeadOffice(organization._id.toString(), user, data);

    await Promise.all([
      this.publishVerificationCredential(provisionedUser._id.toString(), provisionedUser.email),
      this.eventBus.publish(
        new OrganizationRegisteredEvent({
          organizationId: organization._id.toString(),
          userId: provisionedUser._id.toString(),
          email: provisionedUser.email,
          organizationName: organization.name,
          provider: "local",
        }),
      ),
    ]);

    const authResponse = await this.sessionService.createAuthenticatedSession(provisionedUser, session);
    return { success: true, message: "Organization registered successfully.", data: authResponse };
  }

  /**
   * Register Vendor
   */
  async registerVendor(
    data: RegisterVendorDto,
    session: SessionMetadata,
  ): Promise<ApplicationResult<AuthResponse>> {
    const existingUser = await this.userReader.findByEmail(data.email);
    if (existingUser) throw new ConflictException("Email already in use");

    const vendor = await this.repository.createVendor(data);
    const user = await this.userService.createVendorLead(vendor._id, data);

    await Promise.all([
      this.publishVerificationCredential(user._id.toString(), user.email),
      this.eventBus.publish(
        new VendorRegisteredEvent({
          vendorId: vendor._id.toString(),
          userId: user._id.toString(),
          email: user.email,
          vendorName: vendor.name,
          provider: "local",
        }),
      ),
    ]);

    const authResponse = await this.sessionService.createAuthenticatedSession(user, session);
    return { success: true, message: "Vendor registered successfully.", data: authResponse };
  }

  /**
   * Resend Verification OTP (OTP strategy — kept for future mail provider integration)
   */
  async resendVerificationOtp(
    email: string,
  ): Promise<ApplicationResult<{ message: string }>> {
    const user = await this.userReader.findByEmail(email);
    if (!user) throw new NotFoundException("User not found");
    if (user.isVerified) throw new ValidationException("Email already verified");

    const allowed = await this.otpService.canResend(user.id, OtpPurpose.EMAIL_VERIFICATION);
    if (!allowed) throw new BusinessException("Too many OTP requests");

    const otp = await this.otpService.create(user.id, OtpPurpose.EMAIL_VERIFICATION);
    await this.eventBus.publish(
      new OtpRequestedEvent({
        userId: user.id,
        email: user.email,
        purpose: OtpPurpose.EMAIL_VERIFICATION,
        otp,
      }),
    );
    return { success: true, message: "Verification OTP sent successfully.", data: { message: "OTP sent successfully" } };
  }

  /**
   * Regenerate Verification Link (link strategy — invalidates old token, issues fresh one)
   */
  async regenerateVerificationLink(
    email: string,
  ): Promise<ApplicationResult<{ expiresInSeconds: number }>> {
    const user = await this.userReader.findByEmail(email);
    // Do not disclose whether an address exists or is already verified. Return
    // the same success shape without publishing a delivery event in either case.
    if (!user || user.isVerified) {
      return {
        success: true,
        message: "Verification link generated.",
        data: { expiresInSeconds: 300 },
      };
    }

    const { token, allowed } = await this.verificationLinkService.regenerate(
      user.id,
      VerificationLinkPurpose.EMAIL_VERIFICATION,
    );

    if (!allowed) throw new BusinessException("Too many regeneration requests. Please wait before trying again.");

    const verificationUrl = this.buildVerificationUrl(token, user.email);
    await this.eventBus.publish(
      new VerificationLinkRequestedEvent({
        userId: user.id,
        email: user.email,
        purpose: VerificationLinkPurpose.EMAIL_VERIFICATION,
        verificationUrl,
      }),
    );

    return {
      success: true,
      message: "Verification link generated.",
      data: { expiresInSeconds: 300 },
    };
  }

  /**
   * Verify Email by Link Token (link strategy)
   */
  async verifyEmailByLink(
    email: string,
    token: string,
  ): Promise<ApplicationResult<{ message: string }>> {
    const user = await this.userReader.findByEmail(email);
    if (!user) throw new NotFoundException("User not found");

    const valid = await this.verificationLinkService.verify(
      user.id,
      VerificationLinkPurpose.EMAIL_VERIFICATION,
      token,
    );

    if (!valid) throw new ValidationException("Verification link is invalid or has expired");

    await this.userService.markEmailVerified(user.email);
    await this.eventBus.publish(
      new EmailVerifiedEvent({
        userId: user.id,
        email: user.email,
        verifiedAt: new Date().toISOString(),
      }),
    );

    return { success: true, message: "Email verified successfully.", data: { message: "Email verified successfully" } };
  }

  /**
   * Verify Email
   */
  async verifyEmail(
    email: string,
    otp: string,
  ): Promise<ApplicationResult<{ message: string }>> {
    const user = await this.userReader.findByEmail(email);

    if (!user) {
      throw new NotFoundException("User not found");
    }

    const valid = await this.otpService.verify(
      user.id,
      OtpPurpose.EMAIL_VERIFICATION,
      otp,
    );

    if (!valid) {
      throw new ValidationException("Invalid or expired OTP");
    }

    await this.userService.markEmailVerified(user.email);

    await this.eventBus.publish(
      new EmailVerifiedEvent({
        userId: user.id,
        email: user.email,
        verifiedAt: new Date().toISOString(),
      }),
    );

    return {
      success: true,

      message: "Email verified successfully.",

      data: {
        message: "Email verified successfully",
      },
    };
  }

  /**
   * Accept Invitation
   */
  async acceptInvitation(
    dto: AcceptInvitationDto,
    session: SessionMetadata,
  ): Promise<ApplicationResult<AuthResponse>> {
    const invitation = await this.invitationService.validate(dto.token);

    const existingUser = await this.userReader.findByEmail(invitation.email);

    if (existingUser) {
      throw new ConflictException("User already exists");
    }

    const user = await this.userService.createInvitedUser(invitation, dto);

    await this.invitationService.accept(invitation.id, user._id.toString());

    const authResponse = await this.sessionService.createAuthenticatedSession(
      user,
      session,
    );

    return {
      success: true,

      message: "Invitation accepted successfully.",

      data: authResponse,
    };
  }

  /**
   * Login
   */
  async login(
    data: LoginDto,
    session: SessionMetadata,
  ): Promise<ApplicationResult<AuthResponse>> {
    const exists = await this.userReader.existsByEmail(data.email);
    if (!exists) throw new AuthenticationException("Invalid credentials");

    const user = await this.userReader.getRequiredUser(data.email);
    await this.lockoutService.isNotLocked(user);

    if (!user.password) throw new ValidationException("Use your social login provider");

    const isMatch = await comparePassword(data.password, user.password);
    if (!isMatch) {
      await this.userService.incrementFailedLoginAttempts(user._id.toString());
      await this.eventBus.publish(
        new UserLoginFailedEvent({
          email: data.email,
          provider: "local",
          reason: "invalid_password",
          ipAddress: session.ipAddress,
          userAgent: session.userAgent,
        }),
      );
      await this.lockoutService.isLocked(user, session);
      throw new AuthenticationException("Invalid credentials");
    }

    // ─── Temp-invitation expiry check ────────────────────────────────────────
    if (user.status === "pending_invitation" && user.tempPasswordExpiresAt) {
      if (new Date() > user.tempPasswordExpiresAt) {
        // Delete the expired temp user and reject login
        await this.userService.deleteById(user._id.toString());
        throw new AuthenticationException(
          "Invitation credentials have expired. Please ask your admin to send a new invitation.",
        );
      }
      // Within TTL — activate the account on first login
      await this.userService.activate(user._id.toString());
    }

    const authResponse = await this.sessionService.createAuthenticatedSession(user, session);

    if (!user.isVerified && user.status === "pending_verification") {
      return {
        success: true,
        message: "Email verification required. Please verify your email before accessing any other endpoint.",
        data: authResponse,
      };
    }

    if (user.status !== "active" && user.status !== "pending_invitation") {
      await this.lockoutService.isLocked(user, session);
      await this.eventBus.publish(
        new UserLoginFailedEvent({
          email: data.email,
          provider: "local",
          reason: "account_inactive",
          ipAddress: session.ipAddress,
          userAgent: session.userAgent,
        }),
      );
      throw new AuthorizationException("Account is inactive");
    }

    await this.lockoutService.isUnlocked(user);
    await this.userService.recordLogin(user._id.toString());
    void this.eventBus.publish(
      new UserLoggedInEvent({
        userId: user._id.toString(),
        email: user.email,
        sessionId: authResponse.sessionId,
        provider: "local",
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
      }),
    ).catch(() => undefined);

    return { success: true, message: "Login successful.", data: authResponse };
  }

  /**
   * OAuth Organization Signup
   */
  async oauthSignupOrganization(
    profile: OAuthProfile,
    provider: AuthProvider,
    data: OAuthRegisterOrgDto,
    session: SessionMetadata,
  ): Promise<AuthResponse> {
    const existingUser = await this.userReader.findByEmail(profile.email);

    if (existingUser) {
      throw new ConflictException("Account already exists");
    }

    const organization = await this.repository.createOrganization(data);

    const user = await this.userService.createOAuthOrganizationAdmin(
      organization._id.toString(),
      profile,
      provider,
    );
    const provisionedUser = await this.provisionHeadOffice(organization._id.toString(), user, data);

    await this.eventBus.publish(
      new OrganizationRegisteredEvent({
        organizationId: organization._id.toString(),

        userId: provisionedUser._id.toString(),

        email: provisionedUser.email,

        organizationName: organization.name,

        provider,
      }),
    );

    const authResponse = await this.sessionService.createAuthenticatedSession(
      provisionedUser,
      session,
    );

    return authResponse;
  }

  private async provisionHeadOffice(organizationId: string, user: { _id: { toString(): string }; email: string }, data: { organizationName: string; address: { street?: string; city?: string; state?: string; postalCode?: string; country?: string } }) {
    const facility = await this.facilityRepository.create({
      organizationId,
      name: `${data.organizationName} Head Office`,
      address: {
        street: data.address.street ?? data.organizationName,
        city: data.address.city ?? "",
        state: data.address.state ?? "",
        ...(data.address.postalCode ? { postalCode: data.address.postalCode } : {}),
        country: data.address.country ?? "",
      },
      latitude: 0,
      longitude: 0,
    }, user._id.toString());
    await this.locationRepository.create({
      organizationId: toObjectId(organizationId),
      facilityId: facility._id,
      name: "Head Office",
      type: "BUILDING",
      status: "active",
    });
    await this.eventBus.publish(new FacilityCreatedEvent({
      facilityId: facility._id.toString(), organizationId, name: facility.name,
      address: facility.address, createdBy: user._id.toString(),
    }));
    const updated = await this.userService.assignFacility(user._id.toString(), facility._id);
    if (!updated) throw new NotFoundException("Organization administrator could not be assigned to the head office");
    return updated;
  }

  /**
   * OAuth Vendor Signup
   */
  async oauthSignupVendor(
    profile: OAuthProfile,
    provider: AuthProvider,
    data: OAuthRegisterVendorDto,
    session: SessionMetadata,
  ): Promise<AuthResponse> {
    const existingUser = await this.userReader.findByEmail(profile.email);

    if (existingUser) {
      throw new ConflictException("Account already exists");
    }

    const vendor = await this.repository.createVendor(data);

    const user = await this.userService.createOAuthVendorLead(
      vendor._id.toString(),
      profile,
      provider,
    );

    await this.eventBus.publish(
  new VendorRegisteredEvent({
    vendorId: vendor._id.toString(),

    userId: user._id.toString(),

    email: user.email,

    vendorName: vendor.name,

    provider,
  }),
);

    return this.sessionService.createAuthenticatedSession(user, session);
  }

  /**
   * OAuth Invitation Acceptance
   */
  async acceptOAuthInvitation(
    profile: OAuthProfile,
    provider: AuthProvider,
    invitationToken: string,
    session: SessionMetadata,
  ): Promise<AuthResponse> {
    const invitation = await this.invitationService.validate(invitationToken);

    const existingUser = await this.userReader.findByEmail(profile.email);

    if (existingUser) {
      throw new ConflictException("Account already exists");
    }

    const user = await this.userService.createOAuthInvitedUser(
      invitation,
      profile,
      provider,
    );

    await this.invitationService.accept(
      invitation._id.toString(),
      user._id.toString(),
    );

    return this.sessionService.createAuthenticatedSession(user, session);
  }

  /**
   * OAuth Login
   */
  async oauthLogin(
    profile: OAuthProfile,
    provider: AuthProvider,
    session: SessionMetadata,
  ): Promise<AuthResponse> {
    if (!profile.emailVerified) throw new AuthorizationException("OAuth provider email is not verified");
    const user = await this.userService.findAndLinkProvider(
      profile.email,
      provider,
      profile.providerId,
    );

    if (!user) {
      await this.eventBus.publish(
      new UserLoginFailedEvent({
        email: profile.email,
        provider,
        reason: "user_not_found",
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
      }),
    );

    throw new NotFoundException("Account not found");
    }

    await this.lockoutService.isNotLocked(user);

    await this.lockoutService.isUnlocked(user);

    const authResponse = await this.sessionService.createAuthenticatedSession(
      user,
      session,
    );

    await this.userService.recordLogin(user._id.toString());

    await this.eventBus.publish(
      new UserLoggedInEvent({
        userId: user._id.toString(),
        email: user.email,
        sessionId: authResponse.sessionId,
        provider,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
      }),
    );

    return authResponse;
  }


  async getCurrentUser(userId: string) {
    return this.userReader.findById(userId);
  }
}
