import { AuthRepository } from "./auth.repository.js";
import { generateAccessToken } from "@/shared/utils/jwt.js";
import {  comparePassword } from "@/shared/utils/bcrypt.js";
import { AppError } from "@/shared/errors/AppError.js";
import type { RegisterOrgDto, RegisterVendorDto } from "./dto/auth.dto.js";
import type { LoginDto } from "./dto/auth.dto.js";
import { SessionService } from "./session/session.service.js";
import { OtpService } from "./otp/otp.service.js";
import { EmailService } from "@/shared/services/email/email.service.js";
import { OtpPurpose } from "./otp/otp.types.js";
import { OAuthService } from "./oauth/oauth.service.js";
import type { OAuthProfile } from "./oauth/oauth.types.js";
import type { IUser } from "@/modules/users/user.types.js";
import { InvitationService } from "@/modules/invitations/invitation.service.js";
import type { AcceptInvitationDto } from "./dto/invitation.dto.js";
import type { AuthProvider } from "@/shared/constants/auth-providers.js";
import type { AuthResponse } from "./auth.types.js";
import type { SessionMetadata } from "@/shared/types/session.types.js";
import { AuthLogService } from "./auth-log/auth-log.service.js";
import { LockoutService } from "./lockout/lockout.service.js";
import { AuditLogService } from "@/modules/audit/audit.service.js";
import { AUDIT_ACTIONS } from "../audit/audit.types.js";
import { AUTH_ACTIONS } from "./auth-log/auth-log.types.js";
import { UserService } from "../users/user.service.js";

export class AuthService {
  constructor(
    private readonly repository: AuthRepository,
    private readonly userService: UserService,
    private readonly sessionService: SessionService,
    private readonly otpService: OtpService,
    private readonly emailService: EmailService,
    private readonly oauthService: OAuthService,
    private readonly authLogService: AuthLogService,
    private readonly lockoutService: LockoutService,
    private readonly auditLogService: AuditLogService,
    private readonly invitationService: InvitationService
  ) {}

  // ================================
  // AUTH RESPONSE
  // ================================
  private async generateAuthResponse(
    user: IUser,
    session: SessionMetadata,
  ): Promise<AuthResponse> {
    const accessToken = generateAccessToken({
      userId: user._id.toString(),

      role: user.role,

      ...(user.organizationId && {
        organizationId: user.organizationId.toString(),
      }),

      ...(user.vendorId && {
        vendorId: user.vendorId.toString(),
      }),

      ...(user.facilityId && {
        facilityId: user.facilityId.toString(),
      }),
    });

    const { refreshToken, sessionId } = await this.sessionService.createSession(
      user,
      session,
    );

    return {
      refreshToken,
      accessToken,
      sessionId,
      user,
    };
  }

  // ===============================
  // OAUTH SESSION
  // ===============================
  private async createOAuthSession(
    user: IUser,

    session: SessionMetadata,
  ) {
    return this.generateAuthResponse(user, session);
  }

  // =================================
  // ORGANIZATION REGISTRATION
  // =================================

  async registerOrganization(data: RegisterOrgDto, session: SessionMetadata) {
    const existingUser = await this.userService.findByEmail(data.email);

    if (existingUser) {
      throw new AppError("Email already in use", 409);
    }

    const organization = await this.repository.createOrganization(data);

    const user = await this.userService.createOrganizationAdmin(
      organization._id,
      data,
    );

    const otp = await this.otpService.create(
      user._id.toString(),
      OtpPurpose.EMAIL_VERIFICATION,
    );
    await this.emailService.sendVerificationOtp(user.email, otp);

    await this.authLogService.success(user, "local", session);

    await this.auditLogService.log({
      actorId: user._id,

      targetUserId: user._id,

      action: AUDIT_ACTIONS.ORGANIZATION_CREATED,

      entityType: "organization",

      entityId: organization._id,

      organizationId: organization._id,
    });

    return this.generateAuthResponse(user, session);
  }

  // =================================
  // VENDOR REGISTRATION
  // =================================

  async registerVendor(data: RegisterVendorDto, session: SessionMetadata) {
    const existingUser = await this.userService.findByEmail(data.email);

    if (existingUser) {
      throw new AppError("Email already in use", 409);
    }

    const vendor = await this.repository.createVendor(data);

    const user = await this.userService.createVendorLead(vendor._id, data);

    const otp = await this.otpService.create(
      user._id.toString(),
      OtpPurpose.EMAIL_VERIFICATION,
    );
    await this.emailService.sendVerificationOtp(user.email, otp);

    await this.authLogService.success(user, "local", session);

    await this.auditLogService.log({
      actorId: user._id,

      targetUserId: user._id,

      action: AUDIT_ACTIONS.VENDOR_CREATED,

      entityType: "vendor",

      entityId: vendor._id,
    });

    return this.generateAuthResponse(user, session);
  }

  // =======================
  // RESEND OTP
  // =======================
  async resendVerificationOtp(userId: string) {
    const user = await this.userService.findById(userId);

    if (!user) {
      throw new AppError("User not found", 404);
    }

    if (user.isVerified) {
      throw new AppError("Email already verified", 400);
    }

    const allowed = await this.otpService.canResend(
      user._id.toString(),
      OtpPurpose.EMAIL_VERIFICATION,
    );

    if (!allowed) {
      throw new AppError("Too many OTP requests", 429);
    }

    const otp = await this.otpService.create(
      user._id.toString(),
      OtpPurpose.EMAIL_VERIFICATION,
    );

    await this.emailService.sendVerificationOtp(user.email, otp);

    return {
      message: "OTP sent successfully",
    };
  }

  // =======================
  // VERIFY EMAIL
  // =======================

  async verifyEmail(userId: string, otp: string) {
    const user = await this.userService.findById(userId);

    if (!user) {
      throw new AppError("User not found", 404);
    }

    if (user.isVerified) {
      throw new AppError("Email already verified", 400);
    }

    const valid = await this.otpService.verify(
      user._id.toString(),
      OtpPurpose.EMAIL_VERIFICATION,
      otp,
    );

    if (!valid) {
      throw new AppError("Invalid or expired OTP", 400);
    }

    await this.userService.markEmailVerified(user.email);

    return {
      message: "Email verified successfully",
    };
  }

  // =================================
  // ACCEPT INVITATION
  // =================================

  async acceptInvitation(
    dto: AcceptInvitationDto,

    session: SessionMetadata,
  ) {
    const invitation = await this.invitationService.validate(dto.token);

    const existingUser = await this.userService.findByEmail(invitation.email);

    if (existingUser) {
      throw new AppError("User already exists", 409);
    }

    const user = await this.userService.createInvitedUser(invitation, dto);

    await this.invitationService.accept(invitation.id, user._id.toString());

    await this.authLogService.success(user, "local", session);

    await this.auditLogService.log({
      actorId: user._id,

      targetUserId: user._id,

      action: AUDIT_ACTIONS.INVITATION_ACCEPTED,

      entityType: "invitation",

      metadata: {
        invitationId: invitation._id,
      },
    });

    return this.generateAuthResponse(user, session);
  }

  // =================================
  // LOGIN
  // =================================

  async login(data: LoginDto, session: SessionMetadata) {
    const user = await this.userService.findByEmail(data.email);

    if (!user) {
      await this.authLogService.failure(
        data.email,
        "local",
        "user_not_found",
        session,
      );

      throw new AppError("Invalid credentials", 401);
    }

    await this.lockoutService.isNotLocked(user);

    if (!user.password) {
      throw new AppError("Use your social login provider", 400);
    }

    const isMatch = await comparePassword(data.password, user.password);

    if (!isMatch) {
      await this.lockoutService.isLocked(user, session);

      await this.authLogService.failure(
        data.email,
        "local",
        "invalid_password",
        session,
      );
      throw new AppError("Invalid credentials", 401);
    }

    if (!user.isVerified) {
      await this.lockoutService.isLocked(user, session);

      await this.authLogService.failure(
        data.email,
        "local",
        "unverified_email",
        session,
      );
      throw new AppError("Please verify your email", 403);
    }

    if (user.status !== "active") {
      await this.lockoutService.isLocked(user, session);

      await this.authLogService.failure(
        data.email,
        "local",
        "account_inactive",
        session,
      );
      throw new AppError("Account is inactive", 403);
    }

    await this.lockoutService.isUnlocked(user);

    await this.userService.recordLogin(user._id.toString());

    await this.authLogService.success(user, "local", session);

    return this.generateAuthResponse(user, session);
  }

  async googleCallback(code: string, session: SessionMetadata) {
    const profile = await this.oauthService.verifyGoogleCallback(code);

    const user = await this.userService.findAndLinkProvider(
      profile.email,
      "google",
      profile.providerId,
    );

    if (!user) {
      throw new AppError("Account not found", 404);
    }

    return this.createOAuthSession(user, session);
  }

  async linkedInCallback(code: string, session: SessionMetadata) {
    const profile = await this.oauthService.verifyLinkedInCallback(code);

    const user = await this.userService.findAndLinkProvider(
      profile.email,
      "linkedin",
      profile.providerId,
    );

    if (!user) {
      throw new AppError("Account not found", 404);
    }

    return this.createOAuthSession(user, session);
  }

  // =================================
  // OAUTH SIGNUP ORGANIZATION
  // =================================

  async oauthSignupOrganization(
    profile: OAuthProfile,
    provider: AuthProvider,
    data: RegisterOrgDto,
    session: SessionMetadata,
  ) {
    const existingUser = await this.userService.findByEmail(profile.email);

    if (existingUser) {
      throw new AppError("Account already exists", 409);
    }

    const organization = await this.repository.createOrganization(data);

    const user = await this.userService.createOAuthOrganizationAdmin(
      organization._id.toString(),
      profile,
      provider,
    );

    await this.authLogService.success(user, provider, session);

    await this.authLogService.log({
      userId: user._id,

      email: user.email,

      action: AUTH_ACTIONS.OAUTH_SIGNUP_ORGANIZATION,

      provider,

      outcome: "success",

      sessionMetadata: session,

      metadata: {
        provider,
      },
    });

    return this.createOAuthSession(user, session);
  }

  // =================================
  // OAUTH SIGNUP VENDOR
  // =================================

  async oauthSignupVendor(
    profile: OAuthProfile,
    provider: AuthProvider,
    data: RegisterVendorDto,
    session: SessionMetadata,
  ) {
    const existingUser = await this.userService.findByEmail(profile.email);

    if (existingUser) {
      throw new AppError("Account already exists", 409);
    }

    const vendor = await this.repository.createVendor(data);

    const user = await this.userService.createOAuthVendorLead(
      vendor._id.toString(),
      profile,
      provider,
    );

    await this.authLogService.success(user, provider, session);

    await this.authLogService.log({
      userId: user._id,

      email: user.email,

      action: AUTH_ACTIONS.OAUTH_SIGNUP_VENDOR,

      provider,

      outcome: "success",

      sessionMetadata: session,

      metadata: {
        provider,
      },
    });

    return this.createOAuthSession(user, session);
  }

  // =================================
  // OAUTH INVITATION
  // =================================

  async acceptOAuthInvitation(
    profile: OAuthProfile,
    provider: AuthProvider,
    invitationToken: string,
    session: SessionMetadata,
  ) {
    const invitation = await this.invitationService.validate(invitationToken);

    const existingUser = await this.userService.findByEmail(profile.email);

    if (existingUser) {
      throw new AppError("Account already exists", 409);
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

    await this.authLogService.success(user, provider, session);

    await this.authLogService.log({
      userId: user._id,

      email: user.email,

      action: AUTH_ACTIONS.OAUTH_INVITATION_ACCEPTED,

      provider,

      outcome: "success",

      sessionMetadata: session,

      metadata: {
        provider,
      },
    });

    return this.createOAuthSession(user, session);
  }

  // =================================
  // OAUTH LOGIN
  // =================================
  async oauthLogin(
    profile: OAuthProfile,
    provider: AuthProvider,
    session: SessionMetadata,
  ) {
    const user = await this.userService.findAndLinkProvider(
      profile.email,
      provider,
      profile.providerId,
    );

    if (!user) {
      await this.authLogService.failure(
        profile.email,
        provider,
        "user_not_found",
        session,
      );
      throw new AppError("Account not found", 404);
    }

    await this.lockoutService.isNotLocked(user);

    await this.lockoutService.isUnlocked(user);

    await this.userService.recordLogin(user._id.toString());

    await this.authLogService.success(user, provider, session);

    await this.authLogService.log({
      userId: user._id,

      email: user.email,

      action: AUTH_ACTIONS.OAUTH_LOGIN,

      provider,

      outcome: "success",

      sessionMetadata: session,

      metadata: {
        provider,
      },
    });

    return this.createOAuthSession(user, session);
  }
}
