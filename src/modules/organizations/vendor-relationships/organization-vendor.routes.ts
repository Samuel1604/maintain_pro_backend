import { Router } from "express";
import { authMiddleware } from "@/shared/middleware/authenticate.js";
import { authorize } from "@/shared/middleware/authorize.js";
import { requireVerifiedEmail } from "@/shared/middleware/require-verified-email.js";
import { ROLES } from "@/shared/constants/roles.js";
import {
  listOrganizationVendors,
  discoverMarketplaceVendors,
  requestOrganizationVendor,
  getOrganizationVendor,
  changeOrganizationVendorStatus,
  listFacilityVendors,
  associateFacilityVendor,
  removeFacilityVendor,
  respondToVendorRelationship,
  getOrganizationVendorPerformance,
} from "./organization-vendor.controller.js";


const router = Router();
router.use(authMiddleware);

const internal = [ROLES.ADMIN, ROLES.FACILITY_MANAGER, ROLES.FINANCE];

router.get("/", authorize(...internal), listOrganizationVendors);
router.get("/marketplace", authorize(...internal), discoverMarketplaceVendors);
router.patch("/relationships/:organizationId", authorize(ROLES.VENDOR_LEAD, ROLES.VENDOR_MANAGER), requireVerifiedEmail, respondToVendorRelationship);


router.post(
  "/:vendorId/request",
  authorize(ROLES.ADMIN, ROLES.FACILITY_MANAGER),
  requireVerifiedEmail,
  requestOrganizationVendor,
);
router.get("/:vendorId/performance", authorize(...internal), getOrganizationVendorPerformance);
router.get("/:vendorId", authorize(...internal), getOrganizationVendor);
router.patch(
  "/:vendorId/status",
  authorize(ROLES.ADMIN, ROLES.FACILITY_MANAGER),
  requireVerifiedEmail,
  changeOrganizationVendorStatus,
);
router.get(
  "/facilities/:facilityId",
  authorize(...internal),
  listFacilityVendors,
);
router.post(
  "/facilities/:facilityId/vendors/:vendorId",
  authorize(ROLES.ADMIN, ROLES.FACILITY_MANAGER),
  requireVerifiedEmail,
  associateFacilityVendor,
);
router.delete(
  "/facilities/:facilityId/vendors/:vendorId",
  authorize(ROLES.ADMIN, ROLES.FACILITY_MANAGER),
  requireVerifiedEmail,
  removeFacilityVendor,
);
export default router;
