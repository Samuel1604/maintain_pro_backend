import { Router } from "express";
import { authMiddleware } from "@/shared/middleware/authenticate.js";
import { authorize } from "@/shared/middleware/authorize.js";
import { ROLES } from "@/shared/constants/roles.js";
import {
  createSlaAgreement,
  listSlaAgreementsByApplication,
  updateSlaAgreementStatus,
  listSlaAgreementsForVendor,
} from "./sla-agreement.controller.js";

const router = Router();

router.use(authMiddleware);

router.post(
  "/",
  authorize(
    ROLES.ADMIN,
    ROLES.FACILITY_MANAGER,
    ROLES.VENDOR_LEAD,
    ROLES.VENDOR_MANAGER,
  ),
  createSlaAgreement,
);
router.get("/mine", authorize(ROLES.VENDOR_LEAD, ROLES.VENDOR_MANAGER), listSlaAgreementsForVendor);

router.get(
  "/applications/:vendorApplicationId",
  authorize(
    ROLES.ADMIN,
    ROLES.FACILITY_MANAGER,
    ROLES.VENDOR_LEAD,
    ROLES.VENDOR_MANAGER,
  ),
  listSlaAgreementsByApplication,
);

router.patch("/:id/status", authorize(ROLES.ADMIN, ROLES.FACILITY_MANAGER, ROLES.VENDOR_LEAD, ROLES.VENDOR_MANAGER), updateSlaAgreementStatus);

export default router;
