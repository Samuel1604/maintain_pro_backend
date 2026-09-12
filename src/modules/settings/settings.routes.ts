import { Router } from "express";
import { authMiddleware } from "@/shared/middleware/authenticate.js";
import { requireVerifiedEmail } from "@/shared/middleware/require-verified-email.js";
import { getUserSettings, updateUserSettings, getOrganizationSettings, updateOrganizationSettings, getVendorSettings, updateVendorSettings } from "./settings.controller.js";

const router = Router();
router.use(authMiddleware);
router.get("/me", getUserSettings);
router.patch("/me", updateUserSettings);
router.get("/organization", getOrganizationSettings);
router.patch("/organization", requireVerifiedEmail, updateOrganizationSettings);
router.get("/vendor", getVendorSettings);
router.patch("/vendor", requireVerifiedEmail, updateVendorSettings);
export default router;
