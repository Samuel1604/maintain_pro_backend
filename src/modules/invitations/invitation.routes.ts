import { Router } from "express";
import { authMiddleware } from "@/shared/middleware/authenticate.js";
import { authorize } from "@/shared/middleware/authorize.js";
import { ROLES } from "@/shared/constants/roles.js";
import { InvitationController, invitationService } from "@/container/index.js";

const router = Router();
const controller = new InvitationController(invitationService);

router.use(authMiddleware);

router.post(
  "/",
  authorize(ROLES.ADMIN, ROLES.VENDOR_LEAD),
  controller.createInvitation,
);

router.get(
  "/",
  authorize(ROLES.ADMIN, ROLES.VENDOR_LEAD),
  controller.listInvitations,
);

router.get(
  "/:id",
  authorize(ROLES.ADMIN, ROLES.VENDOR_LEAD),
  controller.getInvitation,
);

router.post(
  "/:id/resend",
  authorize(ROLES.ADMIN, ROLES.VENDOR_LEAD),
  controller.resendInvitation,
);

router.post(
  "/:id/revoke",
  authorize(ROLES.ADMIN, ROLES.VENDOR_LEAD),
  controller.revokeInvitation,
);

export default router;
