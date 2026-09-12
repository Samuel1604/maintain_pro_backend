import { Router } from "express";
import multer from "multer";
import { UploadController } from "./upload.controller.js";
import { authMiddleware } from "@/shared/middleware/authenticate.js";
import { uploadPolicyConfig } from "./upload.schema.js";

const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: uploadPolicyConfig.maxFileSize,
  },
});

const router = Router();
const controller = new UploadController();

router.use(authMiddleware);

router.post("/", uploadMiddleware.single("file"), controller.uploadFile);
router.get("/:id", controller.getUploadById);
router.delete("/:id", controller.deleteUpload);

export default router;
