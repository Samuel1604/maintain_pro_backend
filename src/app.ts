import express, { type Request, type Response } from "express";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { corsOptions } from "./config/cors.js";
import { env } from "./config/env.js";
import authRoutes from "@/modules/identity/auth.routes.js";
import billingRoutes from "@/modules/billing/billing.routes.js";
import contractAwardRoutes from "@/modules/contract-awards/contract-award.routes.js";
import facilityRoutes from "@/modules/facilities/facility.routes.js";
import locationRoutes from "@/modules/locations/location.routes.js";
import uploadRoutes from "@/modules/uploads/upload.routes.js";
import invitationRoutes from "@/modules/invitations/invitation.routes.js";
import securityAlertsRoutes from "@/modules/security/security-alerts.routes.js";
import organizationRoutes from "@/modules/organizations/organization.routes.js";
import geographicPolicyRoutes from "@/modules/organizations/marketplace-geographic-policy.routes.js";
import assetRoutes from "@/modules/assets/asset.routes.js";
import assetHistoryRoutes from "@/modules/asset-history/asset-history.routes.js";
import quotationRoutes from "@/modules/quotations/quotation.routes.js";
import serviceRequestRoutes from "@/modules/service-requests/request.routes.js";
import slaAgreementRoutes from "@/modules/sla-agreements/sla-agreement.routes.js";
import userRoutes from "@/modules/users/user.routes.js";
import vendorApplicationRoutes from "@/modules/vendor-applications/vendor-application.routes.js";
import vendorRoutes from "@/modules/vendors/vendor.routes.js";
import organizationVendorRoutes from "@/modules/organizations/vendor-relationships/organization-vendor.routes.js";
import workOrderRoutes from "@/modules/work-orders/work-order.routes.js";
import invoiceRoutes from "@/modules/invoices/invoice.routes.js";
import workOrderCommentRoutes from "@/modules/work-orders/work-order-comment.routes.js";
import preventiveMaintenanceRoutes from "@/modules/preventive-maintenance/pm.routes.js";
import inventoryRoutes from "@/modules/inventory/inventory.routes.js";
import reportRoutes from "@/modules/reports/report.routes.js";
import notificationRoutes from "@/modules/notifications/notification.routes.js";
import settingsRoutes from "@/modules/settings/settings.routes.js";
import searchRoutes from "@/modules/search/search.routes.js";
import deadLetterRoutes from "@/infrastructure/queue/dead-letter/dead-letter.routes.js";
import { errorHandler } from "@/shared/middleware/error-handler.js";
import { notFound } from "@/shared/middleware/not-found.js";
import { responseEnhancer } from "@/shared/response/response-install.js";
import { ensureCsrfCookie, csrfProtection } from "@/shared/middleware/csrf.js";
import { idempotency } from "@/shared/middleware/idempotency.js";
import { performanceMetrics } from "@/shared/middleware/performance.js";
import { queryTiming } from "@/shared/middleware/query-timing.js";
import { requestCorrelation } from "@/shared/middleware/request-correlation.js";
import { HealthService } from "@/infrastructure/health/health.service.js";

const app = express();
const healthService = new HealthService();

app.use(requestCorrelation);
app.use(responseEnhancer);
app.use(helmet());
app.use(
  express.json({
    verify: (req, _res, buffer) => {
      (req as Request & { rawBody?: Buffer }).rawBody = Buffer.from(buffer);
    },
  }),
);
app.use(cors(corsOptions));
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(cookieParser());
app.set("trust proxy", 1);

// CSRF: issue the double-submit cookie on every request, then enforce
// it on all state-changing requests except the pre-session auth
// endpoints (see CSRF_EXEMPT_PATHS in shared/middleware/csrf.ts).
// Applied globally so every module's mutating routes are covered
// automatically, not just auth.
app.use(ensureCsrfCookie);
app.use(csrfProtection);
app.use(idempotency);
app.use(performanceMetrics);
app.use(queryTiming);

app.get("/api/v1/health", (_req: Request, res: Response) => {
  return res.ok(null, "✅ MaintainPro is running...");
});

app.get("/api/v1/health/live", async (_req: Request, res: Response) => {
  return res.ok(await healthService.liveness());
});

app.get("/api/v1/health/ready", async (_req: Request, res: Response) => {
  const result = await healthService.readiness();
  return res.status(result.ready ? 200 : 503).json(result);
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/billing", billingRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/organizations", organizationRoutes);
app.use(
  "/api/v1/organizations/me/marketplace/geographic-policies",
  geographicPolicyRoutes,
);
app.use("/api/v1/facilities", facilityRoutes);
app.use("/api/v1/locations", locationRoutes);
app.use("/api/v1/uploads", uploadRoutes);
app.use("/api/v1/assets", assetRoutes);
app.use("/api/v1/assets", assetHistoryRoutes);
app.use("/api/v1/vendors", vendorRoutes);
app.use("/api/v1/organizations/me/vendors", organizationVendorRoutes);
app.use("/api/v1/invitations", invitationRoutes);
app.use("/api/v1/security/alerts", securityAlertsRoutes);
app.use("/api/v1/service-requests", serviceRequestRoutes);
app.use("/api/v1/work-orders", workOrderRoutes);
app.use("/api/v1/invoices", invoiceRoutes);
app.use("/api/v1/work-orders", workOrderCommentRoutes);
app.use("/api/v1/preventive-maintenance", preventiveMaintenanceRoutes);
app.use("/api/v1/inventory", inventoryRoutes);
app.use("/api/v1/reports", reportRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/settings", settingsRoutes);
app.use("/api/v1/search", searchRoutes);
app.use("/api/v1/vendor-applications", vendorApplicationRoutes);
app.use("/api/v1/quotations", quotationRoutes);
app.use("/api/v1/sla-agreements", slaAgreementRoutes);
app.use("/api/v1/contract-awards", contractAwardRoutes);
app.use("/api/v1/admin/dead-letter", deadLetterRoutes);

app.use(notFound);
app.use(errorHandler);
export default app;
