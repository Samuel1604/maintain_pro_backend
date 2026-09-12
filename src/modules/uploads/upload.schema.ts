import { z } from "zod";

export const uploadPolicyConfig = {
  maxFileSize: 50 * 1024 * 1024, // 50MB max file size
  maxImageSize: 10 * 1024 * 1024, // 10MB image max
  allowedMimeTypes: [
    // Images
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/svg+xml",
    // Documents
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
    "text/csv",
    // Audio / Video
    "audio/mpeg",
    "audio/wav",
    "audio/ogg",
    "video/mp4",
    "video/webm",
    "video/quicktime",
  ],
};

export function getUploadCategory(mimeType: string): "image" | "document" | "video" | "audio" | "other" {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  if (
    mimeType.startsWith("application/") ||
    mimeType.startsWith("text/")
  ) {
    return "document";
  }
  return "other";
}

export const createUploadSchema = z.object({
  facilityId: z.string().optional(),
  purpose: z.enum([
    "profile-avatar", "organization-logo", "vendor-logo", "work-order-attachment",
    "service-request-attachment", "contract-document", "asset-import", "general-attachment",
  ]),
});

export type CreateUploadInput = z.infer<typeof createUploadSchema>;
