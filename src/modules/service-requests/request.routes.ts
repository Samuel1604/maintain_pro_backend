import { Router } from "express";
import { authMiddleware } from "@/shared/middleware/authenticate.js";
import { authorize } from "@/shared/middleware/authorize.js";
import { ROLES } from "@/shared/constants/roles.js";
import {
  approveServiceRequest,
  createServiceRequest,
  rejectServiceRequest,
} from "./request.controller.js";

const router = Router();

router.use(authMiddleware);

router.post(
  "/",
  authorize(
    ROLES.ADMIN,
    ROLES.FACILITY_MANAGER,
    ROLES.TECHNICIAN,
    ROLES.FINANCE,
    ROLES.STAFF,
  ),
  createServiceRequest,
);

router.post(
  "/:id/approve",
  authorize(ROLES.ADMIN, ROLES.FACILITY_MANAGER),
  approveServiceRequest,
);

router.post(
  "/:id/reject",
  authorize(ROLES.ADMIN, ROLES.FACILITY_MANAGER),
  rejectServiceRequest,
);

export default router;
