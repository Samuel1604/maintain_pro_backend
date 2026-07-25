import { UserRepository } from "@/modules/users/user.repository.js";
import { SessionRepository } from "@/modules/auth/session/session.repository.js";
import { AuthRepository } from "@/modules/auth/auth.repository.js";
import { AuthLogRepository } from "@/modules/auth/auth-log/auth-log.repository.js";
import { AuditLogRepository } from "@/modules/audit/audit.repository.js";
import { SecurityAlertRepository } from "@/modules/security/security.repository.js";
import { InvitationRepository } from "@/modules/invitations/invitation.repository.js";
import { VendorRepository } from "@/modules/vendors/vendor.repository.js";
import { OrganizationRepository } from "@/modules/organizations/organization.repository.js";

import { UserService } from "@/modules/users/user.service.js";
import { SessionService } from "@/modules/auth/session/session.service.js";
import { AuthService } from "@/modules/auth/auth.service.js";
import { AuthLogService } from "@/modules/auth/auth-log/auth-log.service.js";
import { AuditLogService } from "@/modules/audit/audit.service.js";
import { SecurityAlertService } from "@/modules/security/security.service.js";
import { InvitationService } from "@/modules/invitations/invitation.service.js";
import { VendorService } from "@/modules/vendors/vendor.service.js";
import { OrganizationService } from "@/modules/organizations/organization.service.js";
import { OtpService } from "@/modules/auth/otp/otp.service.js";
import { RateLimitService } from "@/shared/services/rate-limit.service.js";
import { RedisService } from "@/shared/services/redis.service.js";
import { EmailService } from "@/shared/services/email/email.service.js";
import { LockoutService } from "@/modules/auth/lockout/lockout.service.js";
import { OAuthService } from "@/modules/auth/oauth/oauth.service.js";
import { Resend } from "resend";
import { env } from "@/config/env.js";

export class AppContainer {
  // Repositories
  public readonly userRepository = new UserRepository();
  public readonly sessionRepository = new SessionRepository();
  public readonly authRepository = new AuthRepository();
  public readonly authLogRepository = new AuthLogRepository();
  public readonly auditLogRepository = new AuditLogRepository();
  public readonly securityAlertRepository = new SecurityAlertRepository();
  public readonly invitationRepository = new InvitationRepository();
  public readonly vendorRepository = new VendorRepository();
  public readonly organizationRepository = new OrganizationRepository();

  // Services
  public readonly otpService = new OtpService();
  public readonly rateLimitService = new RateLimitService();
  public readonly redisService = new RedisService();
  public readonly resend = new Resend(env.RESEND_API_KEY);
  public readonly authLogService = new AuthLogService(this.authLogRepository);
  public readonly auditLogService = new AuditLogService(
    this.auditLogRepository,
  );
  public readonly securityAlertService = new SecurityAlertService(
    this.securityAlertRepository,
  );
  public readonly emailService = new EmailService(
    this.redisService,
    this.resend,
  );
  public readonly oauthService = new OAuthService();

  private _sessionService!: SessionService;
  private _userService!: UserService;

  public get sessionService(): SessionService {
    return this._sessionService;
  }

  public get userService(): UserService {
    return this._userService;
  }

  public readonly invitationService: InvitationService;
  public readonly lockoutService: LockoutService;
  public readonly authService: AuthService;
  public readonly vendorService = new VendorService(
    this.vendorRepository,
    this.auditLogService,
  );
  public readonly organizationService = new OrganizationService(
    this.organizationRepository,
    this.auditLogService,
  );

  constructor() {
    const sessionService = new SessionService(
      this.sessionRepository,
      {} as UserService,
      this.authLogService,
      this.securityAlertService,
    );

    const userService = new UserService(
      this.userRepository,
      this.redisService,
      this.securityAlertService,
      sessionService,
      this.otpService,
      this.emailService,
      this.rateLimitService,
      this.auditLogService,
    );

    (sessionService as any).userService = userService;

    this._sessionService = sessionService;
    this._userService = userService;

    this.invitationService = new InvitationService(
      this.invitationRepository,
      this.userService,
      this.emailService,
      this.auditLogService,
    );

    this.lockoutService = new LockoutService(
      this.userService,
      this.auditLogService,
      this.securityAlertService,
    );

    this.authService = new AuthService(
      this.authRepository,
      this.userService,
      this.sessionService,
      this.otpService,
      this.emailService,
      this.oauthService,
      this.authLogService,
      this.lockoutService,
      this.auditLogService,
      this.invitationService,
    );
  }
}
