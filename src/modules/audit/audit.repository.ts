import { AuditLog } from "./audit.model.js";
import type { CreateAuditLogDto } from "./audit.dto.js";
import type { AuditEntity } from "./audit.types.js";

export class AuditLogRepository {
  async create(data: CreateAuditLogDto) {
    return AuditLog.create(data);
  }

  async findByActor(actorId: string) {
    return AuditLog.find({
      actorId,
    }).sort({
      createdAt: -1,
    });
  }

  async findByTargetUser(userId: string) {
    return AuditLog.find({
      targetUserId: userId,
    }).sort({
      createdAt: -1,
    });
  }

  async findByOrganization(organizationId: string) {
    return AuditLog.find({
      organizationId,
    }).sort({
      createdAt: -1,
    });
  }

  async findByEntity(entityType: AuditEntity, entityId: string) {
    return AuditLog.find({
      entityType,
      entityId,
    }).sort({
      createdAt: -1,
    });
  }
}
