import { Router } from "express";
import { authMiddleware } from "@/shared/middleware/authenticate.js";
import { authorize } from "@/shared/middleware/authorize.js";
import { requireVerifiedEmail } from "@/shared/middleware/require-verified-email.js";
import { ROLES } from "@/shared/constants/roles.js";
import {
  createVendorApplication,
  listVendorApplicationsForWorkOrder,
  listVendorApplications,
  updateVendorApplicationStatus,
  withdrawVendorApplication,
} from "./vendor-application.controller.js";

const router = Router();

router.use(authMiddleware);

router.post(
  "/",
  authorize(ROLES.VENDOR_LEAD, ROLES.VENDOR_MANAGER),
  requireVerifiedEmail,
  createVendorApplication,
);
router.get("/mine", authorize(ROLES.VENDOR_LEAD, ROLES.VENDOR_MANAGER), listVendorApplications);
router.patch("/:id/status", authorize(ROLES.ADMIN, ROLES.FACILITY_MANAGER), requireVerifiedEmail, updateVendorApplicationStatus);
router.post("/:id/withdraw", authorize(ROLES.VENDOR_LEAD, ROLES.VENDOR_MANAGER), requireVerifiedEmail, withdrawVendorApplication);

router.get(
  "/work-orders/:workOrderId",
  authorize(ROLES.ADMIN, ROLES.FACILITY_MANAGER),
  listVendorApplicationsForWorkOrder,
);

export default router;
