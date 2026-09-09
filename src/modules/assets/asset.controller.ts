import { requestHandler } from "@/shared/utils/request.js";
import { AssetService } from "./asset.service.js";
import type { AuthRequest } from "@/shared/types/request.js";
import type { createAssetDto, updateAssetDto } from "./asset.types.js";
import { listAssetSchema } from "./asset.schema.js";
import type { Request } from "express";
import { ValidationException } from "@/shared/errors/index.js";
import { assetPdf, assetQrPng } from "@/shared/utils/document-generation.js";

export class AssetController {
  private service = new AssetService();

  import = requestHandler<AuthRequest>(async (req, res) => {
    const file = (req as Request & { file?: { buffer: Buffer; mimetype: string } }).file;
    if (!file) throw new ValidationException("CSV file is required");
    if (file.mimetype !== "text/csv" && file.mimetype !== "application/csv" && file.mimetype !== "application/vnd.ms-excel") throw new ValidationException("Only CSV files are supported");
    return res.ok(await this.service.importCsv(file.buffer.toString("utf8"), req.user), "Asset import completed");
  });

  qr = requestHandler<AuthRequest<{ assetTag: string }>>(async (req, res) => {
    const result = await this.service.findByTagName(req.params.assetTag, req.user);
    if (!result.data) throw new ValidationException("Asset QR payload unavailable");
    return res.ok({ assetTag: result.data.assetTag, qrCode: result.data.qrCode }, "Asset QR payload retrieved");
  });

  qrImage = requestHandler<AuthRequest<{ assetTag: string }>>(async (req, res) => {
    const result = await this.service.findByTagName(req.params.assetTag, req.user);
    if (!result.data) throw new ValidationException("Asset QR unavailable");
    const png = await assetQrPng(result.data.qrCode);
    res.set({ "Content-Type": "image/png", "Content-Disposition": `attachment; filename="${result.data.assetTag}-qr.png"` });
    return res.send(png);
  });

  pdf = requestHandler<AuthRequest<{ assetTag: string }>>(async (req, res) => {
    const result = await this.service.findByTagName(req.params.assetTag, req.user);
    if (!result.data) throw new ValidationException("Asset unavailable");
    const file = await assetPdf(result.data as unknown as Record<string, unknown>);
    res.set({ "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${result.data.assetTag}-asset-record.pdf"` });
    return res.send(file);
  });

  history = requestHandler<AuthRequest<{ assetTag: string }>>(async (req, res) => res.ok((await (await import("@/modules/asset-history/asset-history.service.js")).assetHistoryService.list(req.params.assetTag, req.user, { page: 1, limit: 50 })).data, "Asset history retrieved"));

  /**
   * Create a new asset
   */
  create = requestHandler<AuthRequest<Record<string, never>, createAssetDto>>(async (req, res) => {
    const result = await this.service.create(req.body, req.user);

    return res.created(result.data, result.message);
  });

  /**
   * Get all assets belonging to the user's facility
   */
  findByFacility = requestHandler<AuthRequest>(async (req, res) => {
    const result = await this.service.findByFacility(req.user);

    return res.ok(result.data, result.message);
  });

  list = requestHandler<AuthRequest>(async (req, res) => {
    const result = await this.service.list(req.user, listAssetSchema.parse(req.query));
    return res.ok(result.data, result.message);
  });

  /**
   * Get a single asset by asset tag
   */
  findByTagName = requestHandler<AuthRequest<{ assetTag: string }>>(
    async (req, res) => {
      const result = await this.service.findByTagName(
        req.params.assetTag,
        req.user,
      );

      return res.ok(result.data, result.message);
    },
  );

  /**
   * Update an existing asset
   */
  update = requestHandler<AuthRequest<{ assetTag: string }, updateAssetDto>>(
    async (req, res) => {
      const result = await this.service.update(
        req.params.assetTag,
        req.body,
        req.user,
      );

      return res.ok(result.data, result.message);
    },
  );

  /**
   * Delete an asset
   */
  delete = requestHandler<AuthRequest<{ assetTag: string }>>(
    async (req, res) => {
      const result = await this.service.delete(req.params.assetTag, req.user);

      return res.ok(result.data, result.message);
    },
  );
}
