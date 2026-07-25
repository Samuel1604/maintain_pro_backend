import express, { type Request, type Response } from "express";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { corsOptions } from "./config/cors.js";
import authRoutes from "@/modules/auth/auth.routes.js";
import contractAwardRoutes from "@/modules/contract-awards/contract-award.routes.js";
import facilityRoutes from "@/modules/facilities/facility.routes.js";
import invitationRoutes from "@/modules/invitations/invitation.routes.js";
import organizationRoutes from "@/modules/organizations/organization.routes.js";
import assetRoutes from "@/modules/assets/asset.routes.js";
import quotationRoutes from "@/modules/quotations/quotation.routes.js";
import serviceRequestRoutes from "@/modules/service-requests/request.routes.js";
import slaAgreementRoutes from "@/modules/sla-agreements/sla-agreement.routes.js";
import userRoutes from "@/modules/users/user.routes.js";
import vendorApplicationRoutes from "@/modules/vendor-applications/vendor-application.routes.js";
import vendorRoutes from "@/modules/vendors/vendor.routes.js";
import workOrderRoutes from "@/modules/work-orders/work-order.routes.js";
import { errorHandler } from "@/shared/middleware/error-handler.js";
import { notFound } from "@/shared/middleware/not-found.js";

const app = express();

app.use(helmet());
app.use(express.json());
app.use(cors(corsOptions));
app.use(morgan("dev"));
app.use(cookieParser());
app.set("trust proxy", 1);

app.get("/api/v1/healthcheck", (_req: Request, res: Response) => {
  return res.status(200).json({
    success: true,
    message: "MaintainPro is running...",
  });
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/organizations", organizationRoutes);
app.use("/api/v1/facilities", facilityRoutes);
app.use("/api/v1/assets", assetRoutes);
app.use("/api/v1/vendors", vendorRoutes);
app.use("/api/v1/invitations", invitationRoutes);
app.use("/api/v1/service-requests", serviceRequestRoutes);
app.use("/api/v1/work-orders", workOrderRoutes);
app.use("/api/v1/vendor-applications", vendorApplicationRoutes);
app.use("/api/v1/quotations", quotationRoutes);
app.use("/api/v1/sla-agreements", slaAgreementRoutes);
app.use("/api/v1/contract-awards", contractAwardRoutes);

app.use(notFound);
app.use(errorHandler);
export default app;
