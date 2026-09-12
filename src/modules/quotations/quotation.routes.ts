import { Router } from "express";
import { authMiddleware } from "@/shared/middleware/authenticate.js";
import { authorize } from "@/shared/middleware/authorize.js";
import { ROLES } from "@/shared/constants/roles.js";
import {
  createQuotation,
  listQuotationsByApplication,
  listVendorQuotations,
  listOrganizationQuotations,
  updateQuotationStatus,
  listQuotationRevisions,
  createQuotationRevision,
} from "./quotation.controller.js";

const router = Router();

router.use(authMiddleware);

router.post(
  "/",
  authorize(ROLES.VENDOR_LEAD, ROLES.VENDOR_MANAGER),
  createQuotation,
);

router.get(
  "/applications/:vendorApplicationId",
  authorize(
    ROLES.ADMIN,
    ROLES.FACILITY_MANAGER,
    ROLES.VENDOR_LEAD,
    ROLES.VENDOR_MANAGER,
  ),
  listQuotationsByApplication,
);
router.get("/mine", authorize(ROLES.VENDOR_LEAD, ROLES.VENDOR_MANAGER), listVendorQuotations);
router.get("/organization", authorize(ROLES.ADMIN, ROLES.FACILITY_MANAGER, ROLES.FINANCE), listOrganizationQuotations);

router.patch("/:id/status", authorize(ROLES.ADMIN, ROLES.FACILITY_MANAGER, ROLES.VENDOR_LEAD, ROLES.VENDOR_MANAGER), updateQuotationStatus);
router.get("/:quotationId/revisions", authorize(ROLES.ADMIN, ROLES.FACILITY_MANAGER, ROLES.VENDOR_LEAD, ROLES.VENDOR_MANAGER), listQuotationRevisions);
router.post("/:quotationId/revisions", authorize(ROLES.VENDOR_LEAD, ROLES.VENDOR_MANAGER), createQuotationRevision);

export default router;
