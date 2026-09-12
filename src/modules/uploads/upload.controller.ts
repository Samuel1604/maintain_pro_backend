import type { Request, Response, NextFunction } from "express";
import { UploadService } from "./upload.service.js";
import { ValidationException } from "@/shared/errors/index.js";
import { createUploadSchema } from "./upload.schema.js";

export class UploadController {
  constructor(private readonly uploadService: UploadService = new UploadService()) {}

  uploadFile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const file = req.file;
      if (!file) {
        throw new ValidationException("A file is required");
      }
      const actorId = req.user?.userId;
      const organizationId = req.user?.organizationId;
      const vendorId = req.user?.vendorId;
      const { facilityId, purpose } = createUploadSchema.parse(req.body ?? {});

      const upload = await this.uploadService.processUpload(
        {
          originalname: file!.originalname,
          mimetype: file!.mimetype,
          size: file!.size,
          buffer: file!.buffer,
        },
        {
          actorId: actorId!,
          organizationId,
          vendorId,
          facilityId,
          purpose,
        },
      );

      res.created(upload, "File uploaded successfully");
    } catch (error) {
      next(error);
    }
  };

  getUploadById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const context = {
        actorId: req.user!.userId,
        organizationId: req.user?.organizationId,
        vendorId: req.user?.vendorId,
      };

      const upload = await this.uploadService.getUploadById(id as string, context);
      res.ok(upload, "Upload metadata retrieved successfully");
    } catch (error) {
      next(error);
    }
  };

  deleteUpload = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const context = {
        actorId: req.user!.userId,
        organizationId: req.user?.organizationId,
        vendorId: req.user?.vendorId,
      };

      await this.uploadService.deleteUpload(id as string, context);
      res.ok(null, "Upload deleted successfully");
    } catch (error) {
      next(error);
    }
  };
}
