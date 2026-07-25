import { requestHandler } from "@/shared/utils/request.js";
import { AssetService } from "./asset.service.js";
import type { AuthRequest } from "@/shared/types/request.js";
import type { createAssetDto, updateAssetDto } from "./asset.types.js";

export class AssetController {
  private service = new AssetService();

  /**
   * Create a new asset
   *
   * Access:
   * - Admin
   * - Facility Manager
   *
   * Facility and organization context are derived
   * from the authenticated user (JWT).
   */
  create = requestHandler<AuthRequest<{}, createAssetDto>>(async (req, res) => {
    const asset = await this.service.create(req.body, req.user);

    return res.status(201).json({
      success: true,
      message: "Asset created successfully",
      data: asset,
    });
  });

  /**
   * Get all assets belonging to the user's facility
   *
   * Access:
   * - Admin
   * - Finance
   * - Facility Manager
   * - Technician
   */
  findByFacility = requestHandler<AuthRequest>(async (req, res) => {
    const assets = await this.service.findByFacility(req.user);

    return res.status(200).json({
      success: true,
      count: assets.length,
      data: assets,
    });
  });

  /**
   * Get a single asset by asset tag
   *
   * Example:
   * GET /assets/GEN-001
   *
   * Asset lookup is scoped to:
   * - Organization
   * - Facility
   */
  findByTagName = requestHandler<AuthRequest<{ assetTag: string }>>(
    async (req, res) => {
      const asset = await this.service.findByTagName(
        req.params.assetTag,
        req.user,
      );

      return res.status(200).json({
        success: true,
        data: asset,
      });
    },
  );

  /**
   * Update an existing asset
   *
   * Access:
   * - Admin
   * - Facility Manager
   *
   * Recommended future route:
   * PATCH /assets/:assetTag
   */
  update = requestHandler<AuthRequest<{ assetTag: string }, updateAssetDto>>(
    async (req, res) => {
      const asset = await this.service.update(
        req.params.assetTag,
        req.body,
        req.user,
      );

      return res.status(200).json({
        success: true,
        message: "Asset updated successfully",
        data: asset,
      });
    },
  );

  /**
   * Delete an asset
   *
   * Access:
   * - Admin
   * - Facility Manager
   *
   * Example:
   * DELETE /assets/GEN-001
   */
  delete = requestHandler<AuthRequest<{ assetTag: string }>>(
    async (req, res) => {
      await this.service.delete(req.params.assetTag, req.user);

      return res.status(200).json({
        success: true,
        message: "Asset deleted successfully",
      });
    },
  );
}
