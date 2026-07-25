import { Router } from "express";
import { authMiddleware } from "@/shared/middleware/authenticate.js";
import { authorize } from "@/shared/middleware/authorize.js";
import { ROLES } from "@/shared/constants/roles.js";
import {
  createQuotation,
  listQuotationsByApplication,
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

export default router;
