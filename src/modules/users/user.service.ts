import { Types } from "mongoose";

import { UserRepository } from "./user.repository.js";
import type { IUser } from "./user.types.js";

import { ROLES } from "@/shared/constants/roles.js";

import type { AuthProvider } from "@/shared/constants/auth-providers.js";

import type {
  RegisterOrgDto,
  RegisterVendorDto,
} from "../identity/auth.schema.js";

import type { IInvitation } from "@/modules/invitations/invitation.types.js";
import type { AcceptInvitationDto } from "../identity/dto/invitation.dto.js";

import type { OAuthProfile } from "../identity/oauth/oauth.types.js";

import {
  BusinessException,
  ConflictException,
  NotFoundException,
  ValidationException,
} from "@/shared/errors/index.js";

import { hashPassword, comparePassword } from "@/shared/utils/bcrypt.js";

import { toObjectId } from "@/shared/validators/index.js";

import { RedisService } from "@/shared/services/redis.service.js";
import { RateLimitService } from "@/shared/services/rate-limit.service.js";

import type { EventBus } from "@/infrastructure/events/bus/event-bus.interface.js";
import {
  UserRegisteredEvent,
  OtpRequestedEvent,
  PasswordResetRequestedEvent,
  PasswordResetCompletedEvent,
  PasswordChangedEvent,
  EmailChangedEvent,
} from "@/modules/identity/events/index.js";

import { OtpPurpose } from "@/modules/identity/otp/otp.types.js";

import { OtpService } from "@/modules/identity/otp/otp.service.js";

/**
 * UserService is a publisher, not a side-effect executor.
 *
 * It owns user persistence and publishes the identity events that describe
 * what happened (UserRegisteredEvent, PasswordChangedEvent, EmailChangedEvent,
 * etc.) through the Universal Event Bus. It does NOT call SecurityService or
 * AuditLogService directly — security-alert creation and audit logging for
 * those events are handled by SecurityListener / AuditLogListener, which are
 * subscribed to these events in the container. This keeps one publish site
 * per action instead of every caller (and every side effect) re-implementing
 * "what happens when a password changes".
 */
export class UserService {
  constructor(
    private readonly repository: UserRepository,

    private readonly redisService: RedisService,

    private readonly otpService: OtpService,

    private readonly rateLimitService: RateLimitService,

    private readonly eventBus: EventBus,
  ) {}

  async updateProfile(userId: string, updates: { firstName?: string; lastName?: string; phone?: string; avatar?: string }) {
    return this.repository.update(userId, { $set: updates });
  }

  private buildInvitationMembership(invitation: IInvitation) {
    return {
      role: invitation.role,

      ...(invitation.organizationId && {
        organizationId: invitation.organizationId,
      }),

      ...(invitation.vendorId && {
        vendorId: invitation.vendorId,
      }),

      ...(invitation.facilityId && {
        facilityId: invitation.facilityId,
      }),

      isVerified: true,

      status: "active" as const,
    };
  }

  private buildOAuthUserData(profile: OAuthProfile, provider: AuthProvider) {
    return {
      firstName: profile.firstName,

      lastName: profile.lastName,

      email: profile.email.toLowerCase(),

      ...(profile.avatar && {
        avatar: profile.avatar,
      }),

      provider,

      providers: {
        [provider]: true,
      },

      ...(provider === "google" && {
        googleId: profile.providerId,
      }),

      ...(provider === "linkedin" && {
        linkedinId: profile.providerId,
      }),

      ...(provider === "apple" && {
        appleId: profile.providerId,
      }),
    };
  }

  private async updatePassword(
    userId: string,
    hashedPassword: string,
  ): Promise<void> {
    await this.repository.update(userId, {
      password: hashedPassword,

      lastPasswordChangeAt: new Date(),
    });
  }

  /**
   * Publishes the single generic "user created" event for every account
   * creation path below. Centralized here (rather than left to each
   * caller) so no registration flow can forget it.
   */
  private async publishUserRegistered(user: IUser): Promise<void> {
    await this.eventBus.publish(
      new UserRegisteredEvent({
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
        provider: user.provider,
        ...(user.organizationId && {
          organizationId: user.organizationId.toString(),
        }),
        ...(user.vendorId && {
          vendorId: user.vendorId.toString(),
        }),
      }),
    );
  }

  async create(data: Partial<IUser>): Promise<IUser> {
    return this.repository.create(data);
  }

  async createOrganizationAdmin(
    organizationId: Types.ObjectId,

    data: RegisterOrgDto,
  ): Promise<IUser> {
    const hashedPassword = await hashPassword(data.password);

    const user = await this.repository.create({
      firstName: data.firstName,

      lastName: data.lastName,

      email: data.email.toLowerCase(),

      password: hashedPassword,

      role: ROLES.ADMIN,

      provider: "local",

      organizationId,

      isVerified: false,

      phoneVerified: false,

      status: "pending_verification",
    });

    await this.publishUserRegistered(user);

    return user;
  }

  async assignFacility(userId: string, facilityId: Types.ObjectId): Promise<IUser | null> {
    return this.repository.update(userId, { facilityId });
  }

  async createVendorLead(
    vendorId: Types.ObjectId,

    data: RegisterVendorDto,
  ): Promise<IUser> {
    const hashedPassword = await hashPassword(data.password);

    const user = await this.repository.create({
      firstName: data.firstName,

      lastName: data.lastName,

      email: data.email.toLowerCase(),

      password: hashedPassword,

      role: ROLES.VENDOR_LEAD,

      provider: "local",

      vendorId,

      isVerified: false,

      phoneVerified: false,

      status: "pending_verification",
    });

    await this.publishUserRegistered(user);

    return user;
  }

  async createInvitedUser(
    invitation: IInvitation,
    dto: AcceptInvitationDto,
  ): Promise<IUser> {
    const passwordHash = await hashPassword(dto.password);

    const user = await this.repository.create({
      firstName: dto.firstName,

      lastName: dto.lastName,

      email: invitation.email.toLowerCase(),

      password: passwordHash,

      provider: "local",

      ...this.buildInvitationMembership(invitation),
    });

    await this.publishUserRegistered(user);

    return user;
  }

  /**
   * Creates a temporary invited user with a system-generated password.
   * The account expires after 15 minutes if the user does not login.
   * Used by the temp-invitation flow (admin/vendor lead sends invite with no
   * password input from inviter — credentials shown once in portal UI).
   */
  async createTempInvitedUser(
    invitation: IInvitation,
    tempPassword: string,
  ): Promise<IUser> {
    const passwordHash = await hashPassword(tempPassword);
    const TEMP_TTL_MS = 15 * 60 * 1000;

    const membership = this.buildInvitationMembership(invitation);

    const user = await this.repository.create({
      firstName: invitation.firstName!,
      lastName: invitation.lastName!,
      email: invitation.email.toLowerCase(),
      password: passwordHash,
      provider: "local",
      phoneVerified: false,
      tempPasswordExpiresAt: new Date(Date.now() + TEMP_TTL_MS),
      role: membership.role,
      ...(membership.organizationId && { organizationId: membership.organizationId }),
      ...(membership.vendorId && { vendorId: membership.vendorId }),
      ...(membership.facilityId && { facilityId: membership.facilityId }),
      status: "pending_invitation" as const,
      isVerified: true,
    });

    await this.publishUserRegistered(user);

    return user;
  }

  /**
   * Upsert for the re-invite flow.
   * If a pending_invitation temp user already exists for this email (created
   * during the original invite), refreshes their password hash and TTL.
   * If no temp user exists yet (e.g. first resend after session restart),
   * creates one via createTempInvitedUser.
   */
  async refreshTempInvitedUser(
    invitation: IInvitation,
    tempPassword: string,
  ): Promise<IUser> {
    const TEMP_TTL_MS = 15 * 60 * 1000;
    const existing = await this.repository.findOne({
      email: invitation.email.toLowerCase(),
      status: "pending_invitation",
    });

    if (existing) {
      const passwordHash = await hashPassword(tempPassword);
      const updated = await this.repository.update(existing._id, {
        password: passwordHash,
        tempPasswordExpiresAt: new Date(Date.now() + TEMP_TTL_MS),
      });
      return updated!;
    }

    // No temp user found — create fresh
    return this.createTempInvitedUser(invitation, tempPassword);
  }

  /**
   * Hard-deletes a user by ID.
   * Used during temp-invitation expiry cleanup.
   */
  async deleteById(userId: string): Promise<void> {
    await this.repository.delete(userId);
  }

  async createOAuthUser(
    profile: OAuthProfile,

    provider: AuthProvider,
  ): Promise<IUser> {
    const user = await this.repository.create(
      this.buildOAuthUserData(profile, provider),
    );

    await this.publishUserRegistered(user);

    return user;
  }

  async createOAuthInvitedUser(
    invitation: IInvitation,

    profile: OAuthProfile,

    provider: AuthProvider,
  ): Promise<IUser> {
    const user = await this.repository.create({
      ...this.buildOAuthUserData(profile, provider),

      ...this.buildInvitationMembership(invitation),
    });

    await this.publishUserRegistered(user);

    return user;
  }

  async createOAuthOrganizationAdmin(
    organizationId: string,

    profile: OAuthProfile,

    provider: AuthProvider,
  ): Promise<IUser> {
    const user = await this.repository.create({
      ...this.buildOAuthUserData(profile, provider),

      role: ROLES.ADMIN,

      organizationId: toObjectId(organizationId),
    });

    await this.publishUserRegistered(user);

    return user;
  }

  async createOAuthVendorLead(
    vendorId: string,

    profile: OAuthProfile,

    provider: AuthProvider,
  ): Promise<IUser> {
    const user = await this.repository.create({
      ...this.buildOAuthUserData(profile, provider),

      role: ROLES.VENDOR_LEAD,

      vendorId: toObjectId(vendorId),
    });

    await this.publishUserRegistered(user);

    return user;
  }

  async findAndLinkProvider(
    email: string,
    provider: AuthProvider,
    providerId: string,
  ): Promise<IUser | null> {
    if (provider === "local") {
      return null;
    }

    const user = await this.repository.findByEmail(email);

    if (!user) {
      return null;
    }

    const providerUser = await this.repository.findByProviderId(provider, providerId);
    if (providerUser && providerUser._id.toString() !== user._id.toString()) {
      return null;
    }

    const updates: Record<string, string> = {};

    const linkedProviderId = provider === "google" ? user.googleId : provider === "linkedin" ? user.linkedinId : user.appleId;
    if (linkedProviderId && linkedProviderId !== providerId) return null;
    if (provider === "google" && !user.googleId) updates.googleId = providerId;
    if (provider === "linkedin" && !user.linkedinId) updates.linkedinId = providerId;
    if (provider === "apple" && !user.appleId) updates.appleId = providerId;

    if (Object.keys(updates).length === 0) {
      return user;
    }

    return this.repository.update(user._id, updates);
  }

  async markEmailVerified(userId: string): Promise<void> {
    await this.repository.markEmailVerified(userId);
  }

  async recordLogin(userId: string): Promise<void> {
    await this.repository.update(userId, {
      lastLoginAt: new Date(),
    });
  }

  async lockAccount(userId: string, lockedUntil: Date) {
    return this.repository.update(userId, {
      lockedUntil,
    });
  }

  async unlockAccount(userId: string) {
    return this.repository.update(userId, {
      failedLoginAttempts: 0,

      $unset: {
        lockedUntil: 1,
      },
    });
  }

  async incrementFailedLoginAttempts(userId: string) {
    return this.repository.increment(userId, "failedLoginAttempts");
  }

  async resetFailedLoginAttempts(userId: string) {
    return this.repository.update(userId, {
      failedLoginAttempts: 0,

      $unset: {
        lockedUntil: 1,
      },
    });
  }

  async isLocked(userId: string): Promise<boolean> {
    return this.repository.isLocked(userId);
  }

  async suspend(userId: string) {
    return this.repository.update(userId, {
      status: "suspended",
    });
  }

  async activate(userId: string) {
    return this.repository.update(userId, {
      status: "active",
    });
  }

  async validatePasswordChange(
    user: IUser,

    currentPassword: string,

    newPassword: string,
  ): Promise<void> {
    if (!user.password) {
      throw new BusinessException("Password login unavailable");
    }

    const currentMatches = await comparePassword(
      currentPassword,
      user.password,
    );

    if (!currentMatches) {
      throw new ValidationException("Current password is incorrect");
    }

    const samePassword = await comparePassword(newPassword, user.password);

    if (samePassword) {
      throw new ValidationException("New password must be different");
    }
  }

  async changePassword(
    userId: string,

    currentPassword: string,

    newPassword: string,
  ) {
    const user = await this.repository.findById(userId);

    if (!user) {
      throw new NotFoundException("User not found");
    }

    await this.validatePasswordChange(
      user,

      currentPassword,

      newPassword,
    );

    const hashedPassword = await hashPassword(newPassword);

    await this.updatePassword(
      userId,

      hashedPassword,
    );

    await this.unlockAccount(userId);

    /**
     * Publish only. Security-alert creation and audit logging for a
     * password change are handled by SecurityListener / AuditLogListener,
     * both subscribed to PASSWORD_CHANGED — see container/app.container.ts.
     */
    await this.eventBus.publish(
      new PasswordChangedEvent({
        userId: user._id.toString(),
        email: user.email,
      }),
    );

    return {
      message: "Password changed successfully",
    };
  }

  async requestResetPassword(email: string, ipAddress: string) {
    const rateLimit = await this.rateLimitService.hit(
      `forgot-password:${ipAddress}`,
      5,
      60 * 15,
    );

    const emailLimit = await this.rateLimitService.hit(
      `forgot-password-email:${email}`,
      3,
      60 * 15,
    );

    if (!rateLimit.allowed) {
      throw new BusinessException(
        `Too many requests. Try again in ${rateLimit.ttl} seconds.`,
      );
    }

    if (!emailLimit.allowed) {
      throw new BusinessException(
        `Too many requests for this email. Try again in ${emailLimit.ttl} seconds.`,
      );
    }

    const user = await this.repository.findByEmail(email);

    /**
     * Prevent email enumeration.
     */
    if (!user) {
      return {
        message: "If the account exists, a reset code has been sent.",
      };
    }

    const otp = await this.otpService.create(
      user._id.toString(),

      OtpPurpose.PASSWORD_RESET,
    );

    await this.eventBus.publish(
      new PasswordResetRequestedEvent({
        userId: user._id.toString(),
        email: user.email,
        otp,
      }),
    );

    return {
      message: "If the account exists, a reset code has been sent.",
    };
  }

  async requestEmailChange(
    userId: string,

    newEmail: string,

    ipAddress: string,
  ) {
    const rateLimit = await this.rateLimitService.hit(
      `change-email:${ipAddress}`,

      5,

      60 * 15,
    );

    const emailLimit = await this.rateLimitService.hit(
      `change-email-mail:${newEmail}`,

      3,

      60 * 15,
    );

    if (!rateLimit.allowed) {
      throw new BusinessException(
        `Too many requests. Try again in ${rateLimit.ttl} seconds.`,
      );
    }

    if (!emailLimit.allowed) {
      throw new BusinessException(
        `Too many requests for this email. Try again in ${emailLimit.ttl} seconds.`,
      );
    }

    const existingUser = await this.repository.findByEmail(newEmail);

    if (existingUser) {
      throw new ConflictException("Email already in use");
    }

    await this.redisService.set(
      `email-change:${userId}`,

      newEmail.toLowerCase(),

      60 * 15,
    );

    const otp = await this.otpService.create(
      userId,

      OtpPurpose.EMAIL_CHANGE,
    );

    await this.eventBus.publish(
      new OtpRequestedEvent({
        userId,
        email: newEmail,
        purpose: OtpPurpose.EMAIL_CHANGE,
        otp,
      }),
    );

    return {
      message: "Verification code sent",
    };
  }

  async changeEmail(
    userId: string,

    otp: string,
  ) {
    const user = await this.repository.findById(userId);

    if (!user) {
      throw new NotFoundException("User not found");
    }

    const valid = await this.otpService.verify(
      userId,

      OtpPurpose.EMAIL_CHANGE,

      otp,
    );

    if (!valid) {
      throw new ValidationException("Invalid or expired OTP");
    }

    const newEmail = await this.redisService.get(`email-change:${userId}`);

    if (!newEmail) {
      throw new ValidationException("Invalid or expired OTP");
    }

    const oldEmail = user.email;

    await this.repository.update(
      userId,

      {
        email: newEmail.toLowerCase(),

        lastEmailChangeAt: new Date(),
      },
    );

    await this.redisService.delete(`email-change:${userId}`);

    /**
     * Publish only. Security-alert creation, audit logging, and the
     * "your email was changed" notification are handled by
     * SecurityListener / AuditLogListener / EmailListener, all subscribed
     * to EMAIL_CHANGED — see container/app.container.ts.
     */
    await this.eventBus.publish(
      new EmailChangedEvent({
        userId: user._id.toString(),
        oldEmail,
        newEmail: newEmail.toLowerCase(),
      }),
    );

    return {
      message: "Email changed successfully",
    };
  }

  async resetPassword(
    email: string,

    otp: string,

    password: string,
  ) {
    const user = await this.repository.findByEmail(email);

    if (!user) {
      throw new ValidationException("Invalid request");
    }

    const valid = await this.otpService.verify(
      user._id.toString(),

      OtpPurpose.PASSWORD_RESET,

      otp,
    );

    if (!valid) {
      throw new ValidationException("Invalid or expired OTP");
    }

    const hashedPassword = await hashPassword(password);

    await this.updatePassword(
      user._id.toString(),

      hashedPassword,
    );

    await this.unlockAccount(user._id.toString());

    /**
     * Publish only. Security-alert creation and audit logging for a
     * completed password reset are handled by SecurityListener /
     * AuditLogListener, both subscribed to PASSWORD_RESET_COMPLETED — see
     * container/app.container.ts.
     */
    await this.eventBus.publish(
      new PasswordResetCompletedEvent({
        userId: user._id.toString(),
        email: user.email,
      }),
    );

    return {
      message: "Password reset successfully",
    };
  }
}
