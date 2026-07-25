import { OrganizationRepository } from "./organization.repository.js";
import type { RegisterOrgDto } from "../auth/dto/auth.dto.js";
import { AuditLogService } from "@/modules/audit/audit.service.js";

export class OrganizationService {
  constructor(
    private readonly repository: OrganizationRepository,

    private readonly auditLogService: AuditLogService,
  ) {}

  async create(data: RegisterOrgDto) {
    return this.repository.create(data);
  }

  async findById(organizationId: string) {
    return this.repository.findById(organizationId);
  }

  async update(organizationId: string, updates: Record<string, unknown>) {
    return this.repository.update(organizationId, updates);
  }

  async delete(organizationId: string) {
    return this.repository.delete(organizationId);
  }
}
