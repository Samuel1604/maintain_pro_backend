import { UploadRepository } from "./upload.repository.js";
import { type IStorageProvider } from "@/infrastructure/storage/storage.provider.interface.js";
import { CloudinaryStorageProvider } from "@/infrastructure/storage/cloudinary.storage-provider.js";
import {
  getUploadCategory,
  uploadPolicyConfig,
} from "./upload.schema.js";
import {
  ValidationException,
  NotFoundException,
  AuthorizationException,
} from "@/shared/errors/index.js";
import { toObjectId } from "@/shared/validators/index.js";
import type { IUpload, UploadPurpose } from "./upload.model.js";

export interface ExpressFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export interface UploadContext {
  actorId: string;
  organizationId?: string;
  vendorId?: string;
  facilityId?: string;
  purpose?: UploadPurpose;
}

export class UploadService {
  constructor(
    private readonly repository: UploadRepository = new UploadRepository(),
    private readonly storageProvider: IStorageProvider = new CloudinaryStorageProvider(),
  ) {}

  async processUpload(
    file: ExpressFile,
    context: UploadContext,
  ): Promise<IUpload> {
    if (!file || !file.buffer) {
      throw new ValidationException("No file provided for upload.");
    }
    if (!context.purpose) {
      throw new ValidationException("Upload purpose is required.");
    }

    if (!uploadPolicyConfig.allowedMimeTypes.includes(file.mimetype)) {
      throw new ValidationException(`File type '${file.mimetype}' is not permitted.`);
    }

    if (file.size > uploadPolicyConfig.maxFileSize) {
      throw new ValidationException(
        `File size exceeds maximum permitted limit of ${uploadPolicyConfig.maxFileSize / (1024 * 1024)}MB.`,
      );
    }

    if (file.mimetype.startsWith("image/") && file.size > uploadPolicyConfig.maxImageSize) {
      throw new ValidationException(`Images must be ${uploadPolicyConfig.maxImageSize / (1024 * 1024)}MB or smaller.`);
    }

    const category = getUploadCategory(file.mimetype);
    if (context.purpose === "organization-logo" && !context.organizationId) {
      throw new AuthorizationException("Organization logos require an organization context.");
    }
    if (context.purpose === "vendor-logo" && !context.vendorId) {
      throw new AuthorizationException("Vendor logos require a vendor context.");
    }
    const purpose = context.purpose;
    const purposeFolder = `/${purpose}`;
    const tenantFolder = context.organizationId
      ? `org_${context.organizationId}`
      : context.vendorId
      ? `vendor_${context.vendorId}`
      : "general";

    const uploadResult = await this.storageProvider.upload(file.buffer, {
      folder: `maintainpro/${tenantFolder}/${category}${purposeFolder}`,
      resourceType: category === "image" ? "image" : category === "video" ? "video" : "raw",
    });

    try {
      return await this.repository.create({
        actorId: toObjectId(context.actorId),
        ...(context.organizationId && { organizationId: toObjectId(context.organizationId) }),
        ...(context.vendorId && { vendorId: toObjectId(context.vendorId) }),
        ...(context.facilityId && { facilityId: toObjectId(context.facilityId) }),
        originalName: file.originalname.replace(/[^a-zA-Z0-9._ -]/g, "_").slice(0, 255),
        mimeType: file.mimetype,
        size: file.size,
        category,
        purpose,
        providerPublicId: uploadResult.publicId,
        url: uploadResult.url,
        secureUrl: uploadResult.secureUrl,
        status: "available",
        width: uploadResult.width,
        height: uploadResult.height,
        duration: uploadResult.duration,
      });
    } catch (error) {
      // The provider upload succeeded but metadata persistence failed.
      // Compensate immediately so storage and MongoDB do not diverge.
      try {
        await this.storageProvider.delete(uploadResult.publicId, category);
      } catch {
        // A cleanup worker can retry provider deletion from operational logs.
      }
      throw error;
    }
  }

  async getUploadById(id: string, context: UploadContext): Promise<IUpload> {
    const upload = await this.repository.findById(id);
    if (!upload) {
      throw new NotFoundException("Upload not found.");
    }

    // Enforce tenant/actor authorization check
    const isActor = upload.actorId.toString() === context.actorId;
    const isSameOrg = context.organizationId && upload.organizationId?.toString() === context.organizationId;
    const isSameVendor = context.vendorId && upload.vendorId?.toString() === context.vendorId;

    if (!isActor && !isSameOrg && !isSameVendor) {
      throw new AuthorizationException("You are not authorized to access this upload.");
    }

    return upload;
  }

  async deleteUpload(id: string, context: UploadContext): Promise<void> {
    const upload = await this.getUploadById(id, context);
    await this.repository.updateStatus(id, "deleting");
    try {
      await this.storageProvider.delete(upload.providerPublicId, upload.category);
      await this.repository.delete(id);
    } catch (error) {
      await this.repository.updateStatus(id, "available");
      throw error;
    }
  }
}
