import { AuthRepository } from "./auth.repository.js";
import { SessionService } from "./session/session.service.js";
import { OtpService } from "./otp/otp.service.js";
import { EmailService } from "@/shared/services/email/email.service.js";
import { OAuthService } from "./oauth/oauth.service.js";
import { InvitationService } from "@/modules/invitations/invitation.service.js";
import { AuthLogService } from "./auth-log/auth-log.service.js";
import { LockoutService } from "./lockout/lockout.service.js";
import { AuditLogService } from "@/modules/audit/audit.service.js";
import { UserService } from "../users/user.service.js";


export class AuthContainer {
  
}
