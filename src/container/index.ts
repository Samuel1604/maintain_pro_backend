import { AppContainer } from "@/shared/core/app.container.js";

const container = new AppContainer();

export const authService = container.authService;
export const oauthService = container.oauthService;
export const userService = container.userService;
export const sessionService = container.sessionService;
export const authLogService = container.authLogService;
export const auditService = container.auditLogService;
export const securityAlertService = container.securityAlertService;
export const emailService = container.emailService;
export const lockoutService = container.lockoutService;
export const invitationService = container.invitationService;
export const vendorService = container.vendorService;
export const organizationService = container.organizationService;
export const rateLimitService = container.rateLimitService;
export const redisService = container.redisService;
export const resendService = container.resend;

export * from "./controllers/index.js";
