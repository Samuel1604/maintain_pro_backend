import { VendorRepository } from "./vendor.repository.js";

import type {RegisterVendorDto} from "../auth/dto/auth.dto.js";

import { AuditLogService } from "@/modules/audit/audit.service.js";

export class VendorService {
  constructor(
    private readonly repository: VendorRepository,

    private readonly auditLogService: AuditLogService,
  ) {}

  async create(data: RegisterVendorDto) {
    return this.repository.create(data);
  }

  async findById(vendorId: string) {
    return this.repository.findById(vendorId);
  }

  async update(vendorId: string, updates: Record<string, unknown>) {
    return this.repository.update(vendorId, updates);
  }

  async delete(vendorId: string) {
    return this.repository.delete(vendorId);
  }
}
