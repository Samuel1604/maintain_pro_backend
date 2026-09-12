import { Router } from "express";
import { authMiddleware } from "@/shared/middleware/authenticate.js";
import { listNotifications, unreadCount, markRead, markAllRead, getPreferences, updatePreferences, listEscalationRules, createEscalationRule, updateEscalationRule, deleteEscalationRule } from "./notification.controller.js";

const router = Router();
router.use(authMiddleware);
router.get("/", listNotifications);
router.get("/unread-count", unreadCount);
router.post("/:id/read", markRead);
router.post("/read-all", markAllRead);
router.get("/preferences", getPreferences);
router.patch("/preferences", updatePreferences);
router.get("/escalation-rules", listEscalationRules);
router.post("/escalation-rules", createEscalationRule);
router.patch("/escalation-rules/:id", updateEscalationRule);
router.delete("/escalation-rules/:id", deleteEscalationRule);
export default router;
