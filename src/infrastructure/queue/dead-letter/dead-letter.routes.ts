import { Router } from "express";
import { authMiddleware } from "@/shared/middleware/authenticate.js";
import { authorize } from "@/shared/middleware/authorize.js";
import { ROLES } from "@/shared/constants/roles.js";
import { requestHandler } from "@/shared/utils/request.js";
import { createBullMqConnection } from "@/infrastructure/queue/providers/bullmq/connection.js";
import { DeadLetterAdminService } from "./dead-letter.admin.service.js";
import { DeadLetterQueue } from "./dead-letter.queue.js";
import { NotFoundException } from "@/shared/errors/index.js";

const router = Router();
const admin = new DeadLetterAdminService(new DeadLetterQueue(createBullMqConnection()));
router.use(authMiddleware, authorize(ROLES.ADMIN));
router.get("/", requestHandler(async (req, res) => res.ok(await admin.list(Number(req.query.limit) || 50), "Dead-letter jobs retrieved")));
router.get("/:dlqId", requestHandler(async (req, res) => { const job = await admin.inspect(req.params.dlqId); if (!job) throw new NotFoundException("Dead-letter job not found"); return res.ok(job, "Dead-letter job retrieved"); }));
router.post("/:dlqId/replay", requestHandler(async (req, res) => res.ok({ jobId: await admin.replay(req.params.dlqId) }, "Dead-letter job replayed")));
export default router;
