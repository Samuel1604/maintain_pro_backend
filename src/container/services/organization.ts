import { OrganizationService } from "@/modules/organizations/organization.service.js";
import { OrganizationRepository } from "@/modules/organizations/organization.repository.js";
import { auditService } from "./audit.js";

const organizationRepository = new OrganizationRepository();
export const organizationService = new OrganizationService(
  organizationRepository,
  auditService,
);
