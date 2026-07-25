import { Router } from "express";
import { AssetController } from "./asset.controller.js";
import { authMiddleware } from "@/shared/middleware/authenticate.js";
import { authorize } from "@/shared/middleware/authorize.js";
import { validate } from "@/shared/middleware/validate.js";
import { createAsset, updateAsset } from "./asset.schema.js";
import { ROLES } from "@/shared/constants/roles.js";

const router = Router();
const controller = new AssetController();

/**
 * All asset routes require authentication.
 */
router.use(authMiddleware);

/**
 * Create Asset
 */
router.post(
  "/",
  authorize(ROLES.ADMIN, ROLES.FACILITY_MANAGER),
  validate(createAsset),
  controller.create,
);

/**
 * Get all assets in current facility
 */
router.get(
  "/",
  authorize(
    ROLES.ADMIN,
    ROLES.FACILITY_MANAGER,
    ROLES.TECHNICIAN,
    ROLES.FINANCE,
    ROLES.STAFF,
  ),
  controller.findByFacility,
);

/**
 * Get single asset by asset tag
 */
router.get("/:assetTag", controller.findByTagName);

/**
 * Update asset
 */
router.patch(
  "/",
  authorize(ROLES.ADMIN, ROLES.FACILITY_MANAGER),
  validate(updateAsset),
  controller.update,
);

/**
 * Delete asset
 */
router.delete(
  "/:assetTag",
  authorize(ROLES.ADMIN, ROLES.FACILITY_MANAGER),
  controller.delete,
);

export default router;
