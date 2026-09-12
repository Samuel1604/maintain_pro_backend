import { Router } from "express";
import { authMiddleware } from "@/shared/middleware/authenticate.js";
import { authorize } from "@/shared/middleware/authorize.js";
import { requireVerifiedEmail } from "@/shared/middleware/require-verified-email.js";
import { validate } from "@/shared/middleware/validate.js";
import { ROLES } from "@/shared/constants/roles.js";
import { LocationController } from "./location.controller.js";
import { createLocationSchema, updateLocationSchema } from "./location.schema.js";

const router = Router();
const controller = new LocationController();

router.use(authMiddleware);

router.post(
  "/",
  authorize(ROLES.ADMIN, ROLES.FACILITY_MANAGER),
  requireVerifiedEmail,
  validate(createLocationSchema),
  controller.createLocation,
);

router.get(
  "/",
  authorize(ROLES.ADMIN, ROLES.FACILITY_MANAGER, ROLES.TECHNICIAN, ROLES.FINANCE, ROLES.STAFF),
  controller.getLocationsByOrganization,
);

router.get(
  "/facility/:facilityId",
  authorize(ROLES.ADMIN, ROLES.FACILITY_MANAGER, ROLES.TECHNICIAN, ROLES.FINANCE, ROLES.STAFF),
  controller.getLocationsByFacility,
);

router.get(
  "/:id/children",
  authorize(ROLES.ADMIN, ROLES.FACILITY_MANAGER, ROLES.TECHNICIAN, ROLES.FINANCE, ROLES.STAFF),
  controller.getChildren,
);

router.get("/:id/relationships", authorize(ROLES.ADMIN, ROLES.FACILITY_MANAGER, ROLES.TECHNICIAN, ROLES.FINANCE, ROLES.STAFF), controller.getRelationships);

router.get(
  "/:id",
  authorize(ROLES.ADMIN, ROLES.FACILITY_MANAGER, ROLES.TECHNICIAN, ROLES.FINANCE, ROLES.STAFF),
  controller.getLocationById,
);

router.patch(
  "/:id",
  authorize(ROLES.ADMIN, ROLES.FACILITY_MANAGER),
  requireVerifiedEmail,
  validate(updateLocationSchema),
  controller.updateLocation,
);

router.delete(
  "/:id",
  authorize(ROLES.ADMIN, ROLES.FACILITY_MANAGER),
  requireVerifiedEmail,
  controller.deleteLocation,
);

export default router;
