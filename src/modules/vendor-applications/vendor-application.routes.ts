import { Router } from "express";
import { authMiddleware } from "@/shared/middleware/authenticate.js";
import { authorize } from "@/shared/middleware/authorize.js";
import { ROLES } from "@/shared/constants/roles.js";
import {
  createVendorApplication,
  listVendorApplicationsForWorkOrder,
} from "./vendor-application.controller.js";

const router = Router();

router.use(authMiddleware);

router.post(
  "/",
  authorize(ROLES.VENDOR_LEAD, ROLES.VENDOR_MANAGER),
  createVendorApplication,
);

router.get(
  "/work-orders/:workOrderId",
  authorize(ROLES.ADMIN, ROLES.FACILITY_MANAGER),
  listVendorApplicationsForWorkOrder,
);

export default router;
