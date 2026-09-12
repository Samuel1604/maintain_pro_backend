export interface StorageUploadOptions {
  folder?: string;
  publicId?: string;
  resourceType?: "image" | "raw" | "video" | "auto";
  overwrite?: boolean;
}

export interface StorageUploadResult {
  publicId: string;
  url: string;
  secureUrl: string;
  format?: string;
  resourceType: string;
  bytes: number;
  width?: number;
  height?: number;
  duration?: number;
}

export interface IStorageProvider {
  upload(fileBuffer: Buffer, options?: StorageUploadOptions): Promise<StorageUploadResult>;
  delete(publicId: string, resourceType?: string): Promise<boolean>;
}
