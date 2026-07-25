import { AuditLogRepository } from "./audit.repository.js";
import type { CreateAuditLogDto } from "./audit.dto.js";

export class AuditLogService {
  constructor(private readonly repository: AuditLogRepository) {}

  async log(data: CreateAuditLogDto) {
    return this.repository.create({
      actorType: "user",

      outcome: "success",

      severity: "info",

      ...data,
    });
  }

  
}
