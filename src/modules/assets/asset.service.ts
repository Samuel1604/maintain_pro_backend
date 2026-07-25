import { AssetRepository } from "./asset.repository.js";
import { AccessControlService } from "@/shared/services/authorization.service.js";

import type { Actor } from "../users/user.types.js";

import { AppError } from "@/shared/errors/AppError.js";
import { toObjectId } from "@/shared/validators/objectId.js";

import type { createAssetDto, updateAssetDto } from "./asset.types.js";

export class AssetService {
  private repository = new AssetRepository();

  private accessControl = new AccessControlService();

  /**
   * Create Asset
   */
  async create(assetData: createAssetDto, actor: Actor) {
    const organizationId = this.accessControl.requireOrganization(actor);

    const facilityId = this.accessControl.requireFacility(actor);

    const existingAsset = await this.repository.findByTag(
      assetData.assetTag,
      organizationId,
      facilityId,
    );

    if (existingAsset) {
      throw new AppError("Asset tag already exists in this facility", 409);
    }

    return this.repository.create({
      ...assetData,

      organizationId: toObjectId(organizationId),

      facilityId: toObjectId(facilityId),

      createdBy: toObjectId(actor.userId),
    });
  }

  /**
   * Get all assets in facility
   */
  async findByFacility(actor: Actor) {
    const organizationId = this.accessControl.requireOrganization(actor);

    const facilityId = this.accessControl.requireFacility(actor);

    return this.repository.findByFacility(facilityId, organizationId);
  }

  /**
   * Get Asset
   */
  async findByTagName(assetTag: string, actor: Actor) {
    const organizationId = this.accessControl.requireOrganization(actor);

    const facilityId = this.accessControl.requireFacility(actor);

    const asset = await this.repository.findByTag(
      assetTag,
      organizationId,
      facilityId,
    );

    if (!asset) {
      throw new AppError("Asset not found", 404);
    }

    return asset;
  }

  /**
   * Update Asset
   */
  async update(assetTag: string, data: Partial<updateAssetDto>, actor: Actor) {
    const organizationId = this.accessControl.requireOrganization(actor);

    const facilityId = this.accessControl.requireFacility(actor);

    const asset = await this.repository.findByTag(
      assetTag,
      organizationId,
      facilityId,
    );

    if (!asset) {
      throw new AppError("Asset not found", 404);
    }

    return this.repository.update(assetTag, organizationId, facilityId, data);
  }

  /**
   * Delete Asset
   */
  async delete(assetTag: string, actor: Actor) {
    const organizationId = this.accessControl.requireOrganization(actor);

    const facilityId = this.accessControl.requireFacility(actor);

    const asset = await this.repository.findByTag(
      assetTag,
      organizationId,
      facilityId,
    );

    if (!asset) {
      throw new AppError("Asset not found", 404);
    }

    return this.repository.delete(assetTag, organizationId, facilityId);
  }
}
