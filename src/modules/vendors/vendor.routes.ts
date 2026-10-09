import { Router } from "express";
import { authMiddleware } from "@/shared/middleware/authenticate.js";
import { authorize } from "@/shared/middleware/authorize.js";
import { ROLES } from "@/shared/constants/roles.js";
import {
  getVendor,
  updateVendor,
  getVendorPerformance,
  getVendorDashboard,
} from "./vendor.controller.js";

const router = Router();

router.use(authMiddleware);

router.get(
  "/me",
  authorize(ROLES.VENDOR_LEAD, ROLES.VENDOR_MANAGER, ROLES.VENDOR_TECHNICIAN),
  getVendor,
);
router.get(
  "/me/performance",
  authorize(ROLES.VENDOR_LEAD, ROLES.VENDOR_MANAGER),
  getVendorPerformance,
);
router.get(
  "/me/dashboard",
  authorize(ROLES.VENDOR_LEAD, ROLES.VENDOR_MANAGER, ROLES.VENDOR_TECHNICIAN),
  getVendorDashboard,
);

router.patch("/me", authorize(ROLES.VENDOR_LEAD, ROLES.VENDOR_MANAGER), updateVendor);

export default router;
