import { Router } from "express";
import { authMiddleware } from "@/shared/middleware/authenticate.js";
import { authorize } from "@/shared/middleware/authorize.js";
import { requireVerifiedEmail } from "@/shared/middleware/require-verified-email.js";
import { ROLES } from "@/shared/constants/roles.js";
import {
  createFacility,
  listFacilities,
  getFacility,
  updateFacility,
  deactivateFacility,
  getFacilityStatistics,
  getFacilityRelationships,
} from "./facility.controller.js";

const router = Router();

router.use(authMiddleware);

router.post(
  "/",
  authorize(ROLES.ADMIN, ROLES.FACILITY_MANAGER),
  requireVerifiedEmail,
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

router.get(
  "/statistics",
  authorize(ROLES.ADMIN, ROLES.FACILITY_MANAGER, ROLES.TECHNICIAN, ROLES.FINANCE, ROLES.STAFF),
  getFacilityStatistics,
);

router.get(
  "/:facilityId",
  authorize(
    ROLES.ADMIN,
    ROLES.FACILITY_MANAGER,
    ROLES.TECHNICIAN,
    ROLES.FINANCE,
    ROLES.STAFF,
  ),
  getFacility,
);

router.get("/:facilityId/relationships", authorize(ROLES.ADMIN, ROLES.FACILITY_MANAGER, ROLES.TECHNICIAN, ROLES.FINANCE, ROLES.STAFF), getFacilityRelationships);

router.patch(
  "/:facilityId",
  authorize(ROLES.ADMIN, ROLES.FACILITY_MANAGER),
  requireVerifiedEmail,
  updateFacility,
);

router.post(
  "/:facilityId/deactivate",
  authorize(ROLES.ADMIN, ROLES.FACILITY_MANAGER),
  requireVerifiedEmail,
  deactivateFacility,
);

export default router;
