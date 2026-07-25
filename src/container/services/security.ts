import { SecurityAlertService } from "@/modules/security/security.service.js";
import { SecurityAlertRepository } from "@/modules/security/security.repository.js";

const security = new SecurityAlertRepository();
export const securityAlterService = new SecurityAlertService(security);
