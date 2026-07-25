import { Asset, type IAsset } from "./asset.model.js";

export class AssetRepository {
  async create(data: Partial<IAsset>) {
    return Asset.create(data);
  }

  async findByOrganization(
    organizationId: string,
    pagination?: { limit?: number; skip?: number },
  ) {
    return Asset.find({ organizationId })
      .sort({ createdAt: -1 })
      .limit(pagination?.limit ?? 20)
      .skip(pagination?.skip ?? 0);
  }

  async findByFacility(
    facilityId: string,
    organizationId: string,
    pagination?: { limit?: number; skip?: number },
  ) {
    return Asset.find({ facilityId, organizationId })
      .sort({ createdAt: -1 })
      .limit(pagination?.limit ?? 10)
      .skip(pagination?.skip ?? 0);
  }

  async findByTag(
    assetTag: string,
    organizationId: string,
    facilityId: string,
  ) {
    return Asset.find({
      assetTag,
      organizationId,
      facilityId,
    });
  }

  async update(
    assetTag: string,
    organizationId: string,
    facilityId: string,
    data: Partial<IAsset>,
  ) {
    return Asset.findOneAndUpdate(
      { assetTag, organizationId, facilityId },
      data,
      {
        new: true,
      },
    );
  }

  async delete(id: string, organizationId: string, facilityId: string) {
    return Asset.findOneAndDelete({
      _id: id,
      organizationId,
      facilityId,
    });
  }
}
