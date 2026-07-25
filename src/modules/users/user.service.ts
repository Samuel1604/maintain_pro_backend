import { AppError } from "@/shared/errors/AppError.js";
import { ROLES } from "@/shared/constants/roles.js";
import { User } from "./user.model.js";
import type { IUser } from "./user.types.js";
import { UserRepository } from "./user.repository.js";
import type { AuthProvider } from "@/shared/constants/auth-providers.js";
import type {
  RegisterOrgDto,
  RegisterVendorDto,
} from "../auth/dto/auth.dto.js";
import { Types } from "mongoose";
import { hashPassword } from "@/shared/utils/bcrypt.js";
import type { IInvitation } from "@/modules/invitations/invitation.types.js";
import type { AcceptInvitationDto } from "../auth/dto/invitation.dto.js";
import type { OAuthProfile } from "../auth/oauth/oauth.types.js";
import { toObjectId } from "@/shared/validators/objectId.js";
import { comparePassword } from "@/shared/utils/bcrypt.js";
import { RedisService } from "@/shared/services/redis.service.js";
import { SecurityAlertService } from "../security/security.service.js";
import { SecurityAlertType } from "../security/security.types.js";
import { SessionService } from "../auth/session/session.service.js";
import { OtpService } from "@/modules/auth/otp/otp.service.js";
import { EmailService } from "@/shared/services/email/email.service.js";
import { OtpPurpose } from "@/modules/auth/otp/otp.types.js";
import { RateLimitService } from "@/shared/services/rate-limit.service.js";
import { AuditLogService } from "../audit/audit.service.js";
import { AUDIT_ACTIONS } from "../audit/audit.types.js";

type Actor = {
  userId: string;
  role: string;
};

const organizationReaderRoles: string[] = [
  ROLES.ADMIN,
  ROLES.FACILITY_MANAGER,
  ROLES.FINANCE,
];

const vendorReaderRoles: string[] = [ROLES.VENDOR_LEAD, ROLES.VENDOR_MANAGER];

export class UserService {
  constructor(
    private readonly repository: UserRepository,
    private readonly redisService: RedisService,
    private readonly securityAlertService: SecurityAlertService,
    private readonly sessionService: SessionService,
    private readonly otpService: OtpService,
    private readonly emailService: EmailService,
    private readonly rateLimitService: RateLimitService,
    private readonly auditLogService: AuditLogService,
  ) {}

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
      email: profile.email,

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

  private async updatePassword(userId: string, hashedPassword: string) {
    await this.repository.update(userId, {
      password: hashedPassword,
      lastPasswordChangeAt: new Date(),
    });
  }

  async findById(userId: string) {
    return this.repository.findById(userId);
  }

  async findByEmail(email: string) {
    return this.repository.findByEmail(email);
  }

  async existsByEmail(email: string) {
    return this.repository.existsByEmail(email);
  }

  async create(data: Partial<IUser>) {
    return this.repository.create(data);
  }

  async markEmailVerified(userId: string) {
    return this.repository.markEmailVerified(userId);
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

  async isLocked(userId: string) {
    return this.repository.isLocked(userId);
  }

  async createOrganizationAdmin(
    organizationId: Types.ObjectId,
    data: RegisterOrgDto,
  ) {
    const hashedPassword = await hashPassword(data.password);

    return await this.repository.create({
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
  }

  async createVendorLead(vendorId: Types.ObjectId, data: RegisterVendorDto) {
    const hashedPassword = await hashPassword(data.password);

    return await this.repository.create({
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
  }

  // ===============================
  // FIND AND LINK PROVIDER
  // ===============================
  async findAndLinkProvider(
    email: string,

    provider: AuthProvider,

    providerId: string,
  ) {
    const user = await this.repository.findByEmail(email);

    if (!user) {
      return null;
    }

    const updates: Record<string, string> = {};

    if (provider === "google" && !user.googleId) {
      updates.googleId = providerId;
    }

    if (provider === "linkedin" && !user.linkedinId) {
      updates.linkedinId = providerId;
    }

    if (provider === "apple" && !user.appleId) {
      updates.appleId = providerId;
    }

    if (Object.keys(updates).length === 0) {
      return null;
    }

    return await this.repository.update(user._id, updates);
  }

  async recordLogin(userId: string) {
    await this.repository.update(userId, {
      lastLoginAt: new Date(),
    });
  }

  async getMe(actor: Actor) {
    const user = await this.repository.findById(actor.userId);

    if (!user) {
      throw new AppError("User not found", 404);
    }

    return user;
  }

  async listMyAccountUsers(actor: Actor) {
    const user = await User.findById(actor.userId).select(
      "organizationId vendorId",
    );

    if (!user) {
      throw new AppError("User not found", 404);
    }

    if (organizationReaderRoles.includes(actor.role)) {
      if (!user.organizationId) {
        throw new AppError("User is not attached to an organization", 403);
      }

      return this.repository.findOrganizationUsers(
        user.organizationId.toString(),
      );
    }

    if (vendorReaderRoles.includes(actor.role)) {
      if (!user.vendorId) {
        throw new AppError("User is not attached to a vendor", 403);
      }

      return this.repository.findVendorUsers(user.vendorId.toString());
    }

    throw new AppError("This role cannot list account users", 403);
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

  async createInvitedUser(invitation: IInvitation, dto: AcceptInvitationDto) {
    const passwordHash = await hashPassword(dto.password);

    return this.repository.create({
      firstName: dto.firstName,

      lastName: dto.lastName,

      email: invitation.email,

      password: passwordHash,

      provider: "local",

      ...this.buildInvitationMembership(invitation),
    });
  }

  async createOAuthInvitedUser(
    invitation: IInvitation,
    profile: OAuthProfile,
    provider: AuthProvider,
  ) {
    return this.repository.create({
      ...this.buildOAuthUserData(profile, provider),

      ...this.buildInvitationMembership(invitation),
    });
  }

  async createOAuthUser(profile: OAuthProfile, provider: AuthProvider) {
    return this.repository.create(this.buildOAuthUserData(profile, provider));
  }

  async createOAuthOrganizationAdmin(
    organizationId: string,
    profile: OAuthProfile,
    provider: AuthProvider,
  ) {
    return this.repository.create({
      ...this.buildOAuthUserData(profile, provider),

      role: ROLES.ADMIN,

      organizationId: toObjectId(organizationId),
    });
  }

  async createOAuthVendorLead(
    vendorId: string,
    profile: OAuthProfile,
    provider: AuthProvider,
  ) {
    return this.repository.create({
      ...this.buildOAuthUserData(profile, provider),

      role: ROLES.VENDOR_LEAD,

      vendorId: toObjectId(vendorId),
    });
  }

  async validatePasswordChange(
    user: IUser,
    currentPassword: string,
    newPassword: string,
  ) {
    if (!user.password) {
      throw new AppError("Password login unavailable", 400);
    }

    const matches = await comparePassword(currentPassword, user.password);

    if (!matches) {
      throw new AppError("Current password is incorrect", 400);
    }

    const samePassword = await comparePassword(newPassword, user.password);

    if (samePassword) {
      throw new AppError("New password must be different", 400);
    }
  }

  async getRequiredUser(userId: string) {
    const user = await this.repository.findById(userId);

    if (!user) {
      throw new AppError("User not found", 404);
    }

    return user;
  }

  // =================================
  // CURRENT USER
  // =================================

  async me(userId: string) {
    const user = await this.findById(userId);

    if (!user) {
      throw new AppError("User not found", 404);
    }

    return user;
  }

  // =================================
  // CHANGE PASSWORD
  // =================================
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.findById(userId);

    if (!user) {
      throw new AppError("User not found", 404);
    }

    if (!user.password) {
      throw new AppError("Password login unavailable", 400);
    }

    const matches = await comparePassword(currentPassword, user.password);

    if (!matches) {
      throw new AppError("Current password is incorrect", 400);
    }

    const samePassword = await comparePassword(newPassword, user.password);

    if (samePassword) {
      throw new AppError("New password must be different", 400);
    }

    const hashedPassword = await hashPassword(newPassword);

    await this.updatePassword(userId, hashedPassword);

    // Security:
    // revoke all refresh token
    await this.sessionService.logoutAll(userId);

    await this.securityAlertService.createAlert({
      userId: user._id,

      type: SecurityAlertType.PASSWORD_CHANGED,

      metadata: {
        method: "manual",
      },
    });

    await this.unlockAccount(userId);

    await this.auditLogService.log({
      actorId: user._id,

      targetUserId: user._id,

      action: "password_changed",

      entityType: "user",

      entityId: user._id,
    });

    return {
      message: "Password changed successfully",
    };
  }

  // =================================
  // FORGOT PASSWORD
  // =================================
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
      throw new AppError(
        `Too many requests. Try again in ${rateLimit.ttl} seconds.`,
        429,
      );
    } else if (!emailLimit.allowed) {
      throw new AppError(
        `Too many requests for this email. Try again in ${emailLimit.ttl} seconds.`,
        429,
      );
    }
    const user = await this.findByEmail(email);

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

    await this.emailService.sendPasswordResetOtp(user.email, otp);

    return {
      message: "If the account exists, a reset code has been sent.",
    };
  }

  // =================================
  // CHANGE EMAIL
  // =================================
  async requestEmailChange(userId: string, newEmail: string, ipAddress: string) {

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
      throw new AppError(
        `Too many requests. Try again in ${rateLimit.ttl} seconds.`,
        429,
      );
    } else if (!emailLimit.allowed) {
      throw new AppError(
        `Too many requests for this email. Try again in ${emailLimit.ttl} seconds.`,
        429,
      );
    }

    const existingUser = await this.findByEmail(newEmail);

    if (existingUser) {
      throw new AppError("Email already in use", 409);
    }

    await this.redisService.set(`email-change:${userId}`, newEmail, 60 * 15);

    const otp = await this.otpService.create(userId, OtpPurpose.EMAIL_CHANGE);

    await this.emailService.sendEmailChangeOtp(newEmail, otp);

    return {
      message: "Verification code sent",
    };
  }

  // =================================
  // CHANGE EMAIL
  // =================================
  async changeEmail(userId: string, otp: string) {
    const user = await this.repository.findById(userId);

    if (!user) {
      throw new AppError("User not found", 404);
    }

    const valid = await this.otpService.verify(
      userId,
      OtpPurpose.EMAIL_CHANGE,
      otp,
    );

    if (!valid) {
      throw new AppError("Invalid or expired OTP", 400);
    }

    const oldEmail = user.email;
    const newEmail = await this.redisService.get(`email-change:${userId}`);

    if (!newEmail) {
      throw new AppError("Invalid or expired OTP", 400);
    }

    await this.repository.update(userId, {
      email: newEmail.toLowerCase(),
      lastEmailChangeAt: new Date(),
    });

    await this.redisService.delete(`email-change:${userId}`);

    await this.securityAlertService.createAlert({
      userId: user._id,

      type: SecurityAlertType.EMAIL_CHANGED,

      metadata: {
        oldEmail,
        newEmail,
      },
    });

    await this.auditLogService.log({
      actorId: user._id,

      targetUserId: user._id,

      action: "email_changed",

      entityType: "user",

      entityId: user._id,

      metadata: {
        oldEmail,
        newEmail,
      },
    });

    return {
      message: "Email changed successfully",
    };
  }

  // =================================
  // RESET PASSWORD
  // =================================
  async resetPassword(email: string, otp: string, password: string) {
    const user = await this.findByEmail(email);

    if (!user) {
      throw new AppError("Invalid request", 400);
    }

    const valid = await this.otpService.verify(
      user._id.toString(),
      OtpPurpose.PASSWORD_RESET,
      otp,
    );

    if (!valid) {
      throw new AppError("Invalid or expired OTP", 400);
    }

    const hashedPassword = await hashPassword(password);

    await this.updatePassword(user._id.toString(), hashedPassword);

    /**
     * Kill all refresh tokens.
     */
    await this.sessionService.logoutAll(user._id.toString());

    await this.securityAlertService.createAlert({
      userId: user._id,

      type: SecurityAlertType.PASSWORD_RESET,
    });

    await this.unlockAccount(user._id.toString());

    await this.auditLogService.log({
      actorId: user._id,

      targetUserId: user._id,

      action: AUDIT_ACTIONS.PASSWORD_RESET,

      entityType: "user",

      entityId: user._id,
    });

    return {
      message: "Password reset successfully",
    };
  }
}
