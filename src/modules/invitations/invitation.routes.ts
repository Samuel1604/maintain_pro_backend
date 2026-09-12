import { Router } from "express";
import { authMiddleware } from "@/shared/middleware/authenticate.js";
import { authorize } from "@/shared/middleware/authorize.js";
import { requireVerifiedEmail } from "@/shared/middleware/require-verified-email.js";
import { ROLES } from "@/shared/constants/roles.js";
import { invitationService } from "@/container/index.js";
import { InvitationController } from "./invitation.controller.js";

import { validate } from "@/shared/middleware/validate.js";
import {
  createInvitationSchema,
  listInvitationsSchema,
  invitationIdParamsSchema,
  sendTempInviteSchema,
} from "./invitation.schema.js";

const router = Router();
const controller = new InvitationController(invitationService);

router.use(authMiddleware);

router.post(
  "/",
  authorize(ROLES.ADMIN, ROLES.VENDOR_LEAD, ROLES.VENDOR_MANAGER),
  requireVerifiedEmail,
  validate(createInvitationSchema),
  controller.createInvitation,
);

router.get(
  "/",
  authorize(ROLES.ADMIN, ROLES.VENDOR_LEAD, ROLES.VENDOR_MANAGER),
  validate(listInvitationsSchema),
  controller.listInvitations,
);

router.get(
  "/:id",
  authorize(ROLES.ADMIN, ROLES.VENDOR_LEAD),
  validate(invitationIdParamsSchema),
  controller.getInvitation,
);

router.post(
  "/:id/resend",
  authorize(ROLES.ADMIN, ROLES.VENDOR_LEAD),
  validate(invitationIdParamsSchema),
  controller.resendInvitation,
);

router.post(
  "/:id/revoke",
  authorize(ROLES.ADMIN, ROLES.VENDOR_LEAD),
  validate(invitationIdParamsSchema),
  controller.revokeInvitation,
);

// ─── Temp Invitation (system-generated password) ─────────────────────────────
router.post(
  "/temp",
  authorize(ROLES.ADMIN, ROLES.VENDOR_LEAD),
  requireVerifiedEmail,
  validate(sendTempInviteSchema),
  controller.createTempInvitation,
);

export default router;
