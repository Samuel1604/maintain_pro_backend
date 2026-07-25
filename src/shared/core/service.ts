import { AuthLogService } from "@/modules/auth/auth-log/auth-log.service.js";
import { AuditLogService } from "@/modules/audit/audit.service.js";
import { SessionService } from "@/modules/auth/session/session.service.js";
import { UserService } from "@/modules/users/user.service.js";
import { repositories } from "./repositories.js";

export const services: unknown = {
  authLog: new AuthLogService(repositories.authLog),

  auditLog: new AuditLogService(repositories.auditLog),

  session: new SessionService(
    repositories.session,
    services.user,
    AuthLogService,
    AuditLogService,
  ),

  user: new UserService(),
};
