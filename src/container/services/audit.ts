import { AuditLogService } from "@/modules/audit/audit.service.js";
import { AuditLogRepository } from "@/modules/audit/audit.repository.js";


const auditLog = new AuditLogRepository();
export const auditService = new AuditLogService(auditLog);