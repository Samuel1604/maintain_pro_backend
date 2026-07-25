import { Router } from "express";
import { authMiddleware } from "@/shared/middleware/authenticate.js";
import { authorize } from "@/shared/middleware/authorize.js";
import { ROLES } from "@/shared/constants/roles.js";
import { getOrganization } from "./organization.controller.js";

const router = Router();

router.use(authMiddleware);

router.get(
  "/me",
  authorize(
    ROLES.ADMIN,
    ROLES.FACILITY_MANAGER,
    ROLES.TECHNICIAN,
    ROLES.FINANCE,
    ROLES.STAFF,
  ),
  getOrganization,
);

export default router;
