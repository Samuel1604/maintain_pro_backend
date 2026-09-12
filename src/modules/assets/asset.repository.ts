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

  async findPage(filter: Record<string, unknown>, sort: Record<string, 1 | -1>, skip: number, limit: number) {
    return Asset.find(filter).sort(sort).skip(skip).limit(limit);
  }
  async findCursorPage(filter: Record<string, unknown>, cursor: { createdAt: Date; id: string } | undefined, limit: number) {
    const cursorFilter = cursor ? { ...filter, $or: [{ createdAt: { $lt: cursor.createdAt } }, { createdAt: cursor.createdAt, _id: { $lt: cursor.id } }] } : filter;
    return Asset.find(cursorFilter).sort({ createdAt: -1, _id: -1 }).limit(limit + 1).lean();
  }

  async count(filter: Record<string, unknown>) {
    return Asset.countDocuments(filter);
  }

  async findByTag(
    assetTag: string,
    organizationId: string,
    facilityId: string,
  ) {
    return Asset.findOne({
      assetTag,
      organizationId,
      facilityId,
    });
  }

  async findByTagInOrganization(assetTag: string, organizationId: string) {
    return Asset.findOne({ assetTag, organizationId });
  }

  async findByIdInOrganization(assetId: string, organizationId: string) {
    return Asset.findOne({ _id: assetId, organizationId });
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
      returnDocument: "after",
      },
    );
  }

  async archive(assetTag: string, organizationId: string, facilityId: string) {
    return Asset.findOneAndUpdate({ assetTag, organizationId, facilityId }, { status: "retired" }, { new: true });
  }

  async delete(id: string, organizationId: string, facilityId: string) {
    return Asset.findOneAndDelete({
      _id: id,
      organizationId,
      facilityId,
    });
  }
}
