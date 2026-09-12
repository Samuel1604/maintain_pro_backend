import { Router } from "express";
import { authMiddleware } from "@/shared/middleware/authenticate.js";
import { validate } from "@/shared/middleware/validate.js";
import { securityService } from "@/container/index.js";
import { SecurityAlertsController } from "./security-alerts.controller.js";
import { alertIdParamsSchema } from "./security-alerts.schema.js";

const router = Router();
const controller = new SecurityAlertsController(securityService);

// Every alert here belongs to the authenticated user only — there's no
// admin/cross-user view, so a plain authMiddleware (no role check) is
// sufficient; ownership is enforced at the service/repository layer.
router.use(authMiddleware);

router.get("/", controller.listAlerts);
router.get("/unread-count", controller.getUnreadCount);
router.post("/read-all", controller.markAllRead);
router.patch("/:id/read", validate(alertIdParamsSchema), controller.markRead);
router.patch("/:id/dismiss", validate(alertIdParamsSchema), controller.dismiss);

export default router;
