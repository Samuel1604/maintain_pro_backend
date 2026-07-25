import { Router } from "express";
import { authMiddleware } from "@/shared/middleware/authenticate.js";
import { authorize } from "@/shared/middleware/authorize.js";
import { ROLES } from "@/shared/constants/roles.js";
import { createFacility, listFacilities } from "./facility.controller.js";

const router = Router();

router.use(authMiddleware);

router.post(
  "/",
  authorize(ROLES.ADMIN, ROLES.FACILITY_MANAGER),
  createFacility,
);

router.get(
  "/",
  authorize(
    ROLES.ADMIN,
    ROLES.FACILITY_MANAGER,
    ROLES.TECHNICIAN,
    ROLES.FINANCE,
    ROLES.STAFF,
  ),
  listFacilities,
);

export default router;
