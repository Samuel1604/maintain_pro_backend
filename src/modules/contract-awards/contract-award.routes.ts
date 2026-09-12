import { Router } from "express";
import { authMiddleware } from "@/shared/middleware/authenticate.js";
import { authorize } from "@/shared/middleware/authorize.js";
import { ROLES } from "@/shared/constants/roles.js";
import { createContractAward, listContractAwards, listVendorContractAwards, updateContractAwardStatus, addAwardWorkOrder, listAwardWorkOrders, removeAwardWorkOrder, renewContractAward } from "./contract-award.controller.js";

const router = Router();

router.use(authMiddleware);

router.post(
  "/",
  authorize(ROLES.ADMIN, ROLES.FACILITY_MANAGER),
  createContractAward,
);
router.get("/", authorize(ROLES.ADMIN, ROLES.FACILITY_MANAGER, ROLES.FINANCE), listContractAwards);
router.get("/mine", authorize(ROLES.VENDOR_LEAD, ROLES.VENDOR_MANAGER, ROLES.VENDOR_TECHNICIAN), listVendorContractAwards);
router.patch("/:id/status", authorize(ROLES.ADMIN, ROLES.FACILITY_MANAGER), updateContractAwardStatus);
router.post("/:id/renew", authorize(ROLES.ADMIN, ROLES.FACILITY_MANAGER), renewContractAward);
router.get("/:id/work-orders", authorize(ROLES.ADMIN, ROLES.FACILITY_MANAGER, ROLES.VENDOR_LEAD, ROLES.VENDOR_MANAGER, ROLES.VENDOR_TECHNICIAN), listAwardWorkOrders);
router.post("/:id/work-orders", authorize(ROLES.ADMIN, ROLES.FACILITY_MANAGER), addAwardWorkOrder);
router.delete("/:id/work-orders/:workOrderId", authorize(ROLES.ADMIN, ROLES.FACILITY_MANAGER), removeAwardWorkOrder);

export default router;
