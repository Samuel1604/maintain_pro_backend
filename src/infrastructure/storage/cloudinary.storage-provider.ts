import { env } from "@/config/env.js";
import {
  type IStorageProvider,
  type StorageUploadOptions,
  type StorageUploadResult,
} from "./storage.provider.interface.js";
import { InternalServerException } from "@/shared/errors/index.js";

export class CloudinaryStorageProvider implements IStorageProvider {
  private readonly cloudName?: string;
  private readonly apiKey?: string;
  private readonly apiSecret?: string;

  constructor() {
    this.cloudName = env.CLOUDINARY_CLOUD_NAME;
    this.apiKey = env.CLOUDINARY_API_KEY;
    this.apiSecret = env.CLOUDINARY_API_SECRET;
  }

  private isConfigured(): boolean {
    return Boolean(this.cloudName && this.apiKey && this.apiSecret);
  }

  async upload(
    fileBuffer: Buffer,
    options: StorageUploadOptions = {},
  ): Promise<StorageUploadResult> {
    if (!this.isConfigured()) {
      if (env.NODE_ENV === "production") {
        throw new InternalServerException(
          "Cloudinary storage is not configured for production uploads.",
        );
      }

      const mockId = `mock_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const folder = options.folder ? `${options.folder}/` : "";
      return {
        publicId: `${folder}${mockId}`,
        url: `http://localhost:8080/mock-storage/${folder}${mockId}`,
        secureUrl: `http://localhost:8080/mock-storage/${folder}${mockId}`,
        resourceType: options.resourceType || "auto",
        bytes: fileBuffer.length,
      };
    }

    try {
      const { v2: cloudinary } = await import("cloudinary");
      cloudinary.config({
        cloud_name: this.cloudName,
        api_key: this.apiKey,
        api_secret: this.apiSecret,
        secure: true,
      });

      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: options.folder,
            public_id: options.publicId,
            resource_type: options.resourceType || "auto",
            overwrite: options.overwrite ?? true,
          },
          (error: unknown, result: unknown) => {
            if (error || !result) {
              const message =
                typeof error === "object" &&
                error !== null &&
                "message" in error
                  ? String((error as { message?: unknown }).message)
                  : "Unknown error";

              return reject(
                new InternalServerException(
                  `Cloudinary upload failed: ${message}`,
                ),
              );
            }

            if (typeof result !== "object" || result === null) {
              return reject(
                new InternalServerException(
                  "Cloudinary upload returned unexpected result",
                ),
              );
            }

            const res = result as Record<string, unknown>;

            resolve({
              publicId: typeof res.public_id === "string" ? res.public_id : "",
              url: typeof res.url === "string" ? res.url : "",
              secureUrl: typeof res.secure_url === "string" ? res.secure_url : "",
              format: typeof res.format === "string" ? res.format : undefined,
              resourceType: typeof res.resource_type === "string" ? res.resource_type : "auto",
              bytes: typeof res.bytes === "number" ? res.bytes : 0,
              width: typeof res.width === "number" ? res.width : undefined,
              height: typeof res.height === "number" ? res.height : undefined,
              duration:
                typeof res.duration === "number" ? res.duration : undefined,
            });
          },
        );
        uploadStream.end(fileBuffer);
      });
    } catch (err: unknown) {
      const message =
        typeof err === "object" && err !== null && "message" in err
          ? String((err as { message?: unknown }).message)
          : String(err);
      throw new InternalServerException(
        `Storage upload provider error: ${message}`,
      );
    }
  }

  async delete(
    publicId: string,
    resourceType: string = "image",
  ): Promise<boolean> {
    if (!this.isConfigured()) {
      if (env.NODE_ENV === "production") {
        throw new InternalServerException(
          "Cloudinary storage is not configured for production deletes.",
        );
      }
      return true;
    }

    try {
      const { v2: cloudinary } = await import("cloudinary");
      cloudinary.config({
        cloud_name: this.cloudName,
        api_key: this.apiKey,
        api_secret: this.apiSecret,
        secure: true,
      });

      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
      });
      return result.result === "ok" || result.result === "not found";
    } catch (err: unknown) {
      const message =
        typeof err === "object" && err !== null && "message" in err
          ? String((err as { message?: unknown }).message)
          : String(err);
      throw new InternalServerException(
        `Storage delete provider error: ${message}`,
      );
    }
  }
}
