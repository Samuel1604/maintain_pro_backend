import { Router } from "express";
import { authMiddleware } from "@/shared/middleware/authenticate.js";
import { authorize } from "@/shared/middleware/authorize.js";
import { ROLES } from "@/shared/constants/roles.js";
import { getMe, listAccountUsers } from "./user.controller.js";

const router = Router();

router.use(authMiddleware);

router.get("/me", getMe);

router.get(
  "/",
  authorize(
    ROLES.ADMIN,
    ROLES.FACILITY_MANAGER,
    ROLES.FINANCE,
    ROLES.VENDOR_LEAD,
    ROLES.VENDOR_MANAGER,
  ),
  listAccountUsers,
);

export default router;
