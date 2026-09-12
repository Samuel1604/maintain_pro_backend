import { AuditLogRepository } from "./audit.repository.js";
import type { CreateAuditLogDto } from "./audit.dto.js";

export class AuditLogService {
  constructor(private readonly repository: AuditLogRepository) {}

  async log(data: CreateAuditLogDto) {
    const createdAt = new Date();
    const retentionYears = 1;
    const retentionUntil = new Date(createdAt);
    retentionUntil.setFullYear(retentionUntil.getFullYear() + retentionYears);

    return this.repository.create({
      actorType: "user",

      outcome: "success",

      severity: "info",

      ...data,
      retentionUntil,
    });
  }

  
}
