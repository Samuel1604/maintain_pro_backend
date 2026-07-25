import { UserRepository } from "@/modules/users/user.repository.js";
import { SessionRepository } from "@/modules/auth/session/session.repository.js";
import { AuthLogRepository } from "@/modules/auth/auth-log/auth-log.repository.js";
import { AuditLogRepository } from "@/modules/audit/audit.repository.js";


export const repositories = {
  user: new UserRepository(),
  session: new SessionRepository(),
  authLog: new AuthLogRepository(),
  auditLog: new AuditLogRepository(),
};