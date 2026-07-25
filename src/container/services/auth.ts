import { AuthService } from "@/modules/auth/auth.service.js";
import { AuthLogService } from "@/modules/auth/auth-log/auth-log.service.js";
import { AuthLogRepository } from "@/modules/auth/auth-log/auth-log.repository.js";
import { AuthRepository } from "@/modules/auth/auth.repository.js";
import { userService } from "./user.js"
import {sessionService} from "./session.js"
import { auditService } from "./audit.js";
import { emailService } from "./email.js";
import { OtpService } from "@/modules/auth/otp/otp.service.js";
import { OAuthService } from "@/modules/auth/oauth/oauth.service.js";
import { LockoutService } from "@/modules/auth/lockout/lockout.service.js";
import { invitationService } from "./invitation.js";
import { securityAlterService } from "./security.js";


const auth = new AuthRepository();
const authLog = new AuthLogRepository();

export const otpService = new OtpService();


export const oauthService = new OAuthService();
export const lockoutService = new LockoutService(
    userService,
    auditService,
    securityAlterService
);

export const authLogService = new AuthLogService(authLog);

export const authService = new AuthService(
  auth,
  userService,
  sessionService,
  otpService,
  emailService,
  oauthService,
  authLogService,
  lockoutService,
  auditService,
  invitationService,
);
