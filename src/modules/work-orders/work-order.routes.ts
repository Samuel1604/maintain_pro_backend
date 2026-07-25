import { Router } from "express";
import { authMiddleware } from "@/shared/middleware/authenticate.js";
import { authorize } from "@/shared/middleware/authorize.js";
import { ROLES } from "@/shared/constants/roles.js";
import {
  approveWorkOrderCompletion,
  createWorkOrder,
  listOpenMarketplaceWorkOrders,
  rejectWorkOrderCompletion,
  updateWorkOrderProgress,
} from "./work-order.controller.js";

const router = Router();

router.use(authMiddleware);

router.post(
  "/",
  authorize(ROLES.ADMIN, ROLES.FACILITY_MANAGER),
  createWorkOrder,
);

router.get(
  "/marketplace/open",
  authorize(ROLES.VENDOR_LEAD, ROLES.VENDOR_MANAGER),
  listOpenMarketplaceWorkOrders,
);

router.patch(
  "/:id/progress",
  authorize(ROLES.TECHNICIAN, ROLES.VENDOR_TECHNICIAN),
  updateWorkOrderProgress,
);

router.post(
  "/:id/completion/approve",
  authorize(ROLES.ADMIN, ROLES.FACILITY_MANAGER),
  approveWorkOrderCompletion,
);

router.post(
  "/:id/completion/reject",
  authorize(ROLES.ADMIN, ROLES.FACILITY_MANAGER),
  rejectWorkOrderCompletion,
);

export default router;
