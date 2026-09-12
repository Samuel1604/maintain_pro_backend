import { AssetRepository } from "./asset.repository.js";
import { AccessControlService } from "@/shared/services/authorization.service.js";
import { ConflictException, NotFoundException } from "@/shared/errors/index.js";
import { toObjectId } from "@/shared/validators/index.js";
import { AssetCategory, type createAssetDto, type updateAssetDto } from "./asset.types.js";
import type { IAsset } from "./asset.model.js";
import type { ListAssetInput } from "./asset.schema.js";
import type { ApplicationResult } from "@/shared/application-result/index.js";
import type { AssetResponse } from "./dto/asset.dto.js";
import { toAssetResponse } from "./dto/asset.mapper.js";
import type { JwtPayload } from "@/shared/types/jwt.types.js";
import { LocationRepository } from "@/modules/locations/location.repository.js";
import { assetHistoryService } from "@/modules/asset-history/asset-history.service.js";
import { ASSET_HISTORY_EVENTS } from "@/modules/asset-history/asset-history.types.js";
import { z } from "zod";
import { RedisCache } from "@/infrastructure/cache/redis.cache.js";
import { cacheKeys, cacheTtlSeconds } from "@/infrastructure/cache/cache-keys.js";
import { cacheHash } from "@/shared/utils/cache-hash.js";

const importRowSchema = z.object({
  assetTag: z.string().trim().min(1),
  name: z.string().trim().min(1),
  category: z.enum(["hardware", "software", "infrastructure", "other"]),
  locationId: z.string().regex(/^[a-f\d]{24}$/i),
  serialNumber: z.string().trim().optional(),
  manufacturer: z.string().trim().optional(),
  modelNumber: z.string().trim().optional(),
});

export class AssetService {
  private repository = new AssetRepository();
  private accessControl = new AccessControlService();
  private locationRepository = new LocationRepository();
  private cache = new RedisCache();

  async importCsv(csv: string, actor: JwtPayload) {
    const lines = csv.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim().length > 0);
    if (lines.length < 2) throw new ConflictException("Import file must contain a header and at least one data row");
    const headers = this.parseCsvLine(lines[0]!).map((header) => header.trim());
    const imported: AssetResponse[] = [];
    const errors: Array<{ row: number; message: string }> = [];
    for (let index = 1; index < lines.length; index += 1) {
      const values = this.parseCsvLine(lines[index]!);
      const raw = Object.fromEntries(headers.map((header, column) => [header, values[column]?.trim() ?? ""]));
      const parsed = importRowSchema.safeParse(raw);
      if (!parsed.success) { errors.push({ row: index + 1, message: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ") }); continue; }
      try { const result = await this.create({ ...parsed.data, category: parsed.data.category as AssetCategory }, actor); if (result.data) imported.push(result.data); }
      catch (error) { errors.push({ row: index + 1, message: error instanceof Error ? error.message : "Unable to import row" }); }
    }
    return { imported: imported.length, updated: 0, skipped: errors.length, errors, assets: imported };
  }

  private parseCsvLine(line: string): string[] {
    const cells: string[] = []; let cell = ""; let quoted = false;
    for (let index = 0; index < line.length; index += 1) { const character = line[index]; if (character === '"' && line[index + 1] === '"') { cell += '"'; index += 1; } else if (character === '"') quoted = !quoted; else if (character === "," && !quoted) { cells.push(cell); cell = ""; } else cell += character; }
    cells.push(cell); return cells;
  }

  /**
   * Create Asset
   */
  async create(assetData: createAssetDto, actor: JwtPayload): Promise<ApplicationResult<AssetResponse>> {
    const organizationId = this.accessControl.requireOrganization(actor);
    const facilityId = this.accessControl.requireFacility(actor);
    const location = await this.locationRepository.findById(assetData.locationId);
    if (!location || location.organizationId.toString() !== organizationId || location.facilityId.toString() !== facilityId || location.status !== "active") {
      throw new NotFoundException("Location not found in your facility");
    }

    const existingAsset = await this.repository.findByTag(
      assetData.assetTag,
      organizationId,
      facilityId,
    );

    if (existingAsset) {
      throw new ConflictException("Asset tag already exists in this facility");
    }

    const asset = await this.repository.create({
      ...assetData,
      organizationId: toObjectId(organizationId),
      facilityId: toObjectId(facilityId),
      locationId: toObjectId(assetData.locationId),
      createdBy: toObjectId(actor.userId),
    });
    await assetHistoryService.append({ organizationId, assetId: asset._id.toString(), event: ASSET_HISTORY_EVENTS.CREATED, description: "Asset created", actorId: actor.userId, sourceType: "asset", sourceId: asset._id.toString() });
    await this.cache.deleteByPattern(`${cacheKeys.tenantPrefix(organizationId)}dashboard:*`);

    return {
      success: true,
      message: "Asset created successfully",
      data: toAssetResponse(asset),
    };
  }

  /**
   * Get all assets in facility
   */
  async findByFacility(actor: JwtPayload): Promise<ApplicationResult<AssetResponse[]>> {
    const organizationId = this.accessControl.requireOrganization(actor);
    const facilityId = this.accessControl.requireFacility(actor);
    const listKey = cacheKeys.assetList(organizationId, cacheHash({ facilityId }));
    const cachedList = await this.cache.get<AssetResponse[]>(listKey);
    if (cachedList) return { success: true, message: "Assets retrieved successfully", data: cachedList };

    const assets = await this.repository.findByFacility(facilityId, organizationId);
    const data = assets.map(toAssetResponse);
    await this.cache.set(listKey, data, cacheTtlSeconds.list);

    return {
      success: true,
      message: "Assets retrieved successfully",
      data,
    };
  }

  async list(actor: JwtPayload, options: ListAssetInput): Promise<ApplicationResult<{ data: AssetResponse[]; pagination: { page: number; limit: number; total: number; pages: number }; nextCursor?: string; hasMore?: boolean }>> {
    const organizationId = this.accessControl.requireOrganization(actor);
    const facilityId = this.accessControl.requireFacility(actor);
    const listKey = cacheKeys.assetList(organizationId, cacheHash({ facilityId, options }));
    const filter: Record<string, unknown> = { organizationId, facilityId };
    if (options.status) filter.status = options.status;
    if (options.category) filter.category = options.category;
    if (options.locationId) filter.locationId = options.locationId;
    if (options.search) filter.$or = [{ assetTag: { $regex: options.search, $options: 'i' } }, { name: { $regex: options.search, $options: 'i' } }, { serialNumber: { $regex: options.search, $options: 'i' } }];
    const sort: Record<string, 1 | -1> = options.sort === 'name' ? { name: 1 } : options.sort === 'assetTag' ? { assetTag: 1 } : options.sort === 'createdAt' ? { createdAt: 1 } : { createdAt: -1 };
    const total = await this.repository.count(filter);
    const cursor = options.cursor ? JSON.parse(Buffer.from(options.cursor, "base64url").toString("utf8")) as { createdAt: string; id: string } : undefined;
    const data = cursor ? await this.repository.findCursorPage(filter, { createdAt: new Date(cursor.createdAt), id: cursor.id }, options.limit) : await this.repository.findPage(filter, sort, (options.page - 1) * options.limit, options.limit);
    const hasMore = Boolean(cursor && data.length > options.limit);
    const items = hasMore ? data.slice(0, options.limit) : data;
    const last = items[items.length - 1];
    const nextCursor = hasMore && last ? Buffer.from(JSON.stringify({ createdAt: last.createdAt, id: last._id })).toString("base64url") : undefined;
    const result = { data: items.map(toAssetResponse), pagination: { page: options.page, limit: options.limit, total, pages: Math.ceil(total / options.limit) }, ...(cursor ? { nextCursor, hasMore } : {}) };
    await this.cache.set(listKey, result, cacheTtlSeconds.list);
    return { success: true, message: 'Assets retrieved successfully', data: result };
  }

  /**
   * Get Asset
   */
  async findByTagName(assetTag: string, actor: JwtPayload): Promise<ApplicationResult<AssetResponse>> {
    const organizationId = this.accessControl.requireOrganization(actor);
    const facilityId = this.accessControl.requireFacility(actor);

    const key = cacheKeys.asset(organizationId, assetTag);
    const cached = await this.cache.get<AssetResponse>(key);
    if (cached) return { success: true, message: "Asset retrieved successfully", data: cached };
    const asset = await this.repository.findByTag(
      assetTag,
      organizationId,
      facilityId,
    );

    if (!asset) {
      throw new NotFoundException("Asset not found");
    }

    const data = toAssetResponse(asset);
    await this.cache.set(key, data, cacheTtlSeconds.asset);
    return {
      success: true,
      message: "Asset retrieved successfully",
      data,
    };
  }

  /**
   * Update Asset
   */
  async update(assetTag: string, data: Partial<updateAssetDto>, actor: JwtPayload): Promise<ApplicationResult<AssetResponse | null>> {
    const organizationId = this.accessControl.requireOrganization(actor);
    const facilityId = this.accessControl.requireFacility(actor);

    const asset = await this.repository.findByTag(
      assetTag,
      organizationId,
      facilityId,
    );

    if (!asset) {
      throw new NotFoundException("Asset not found");
    }

    if (data.locationId) {
      const location = await this.locationRepository.findById(data.locationId);
      if (!location || location.organizationId.toString() !== organizationId || location.facilityId.toString() !== facilityId || location.status !== "active") throw new NotFoundException("Location not found in your facility");
    }

    const updated = await this.repository.update(assetTag, organizationId, facilityId, data as Partial<IAsset>);
    if (updated) {
      await this.cache.delete(cacheKeys.asset(organizationId, assetTag));
      await this.cache.deleteByPattern(`${cacheKeys.tenantPrefix(organizationId)}assets:list:*`);
      await this.cache.deleteByPattern(`${cacheKeys.tenantPrefix(organizationId)}dashboard:*`);
      const event = data.locationId && data.locationId !== asset.locationId.toString() ? ASSET_HISTORY_EVENTS.LOCATION_CHANGED : data.status && data.status !== asset.status ? ASSET_HISTORY_EVENTS.STATUS_CHANGED : ASSET_HISTORY_EVENTS.UPDATED;
      await assetHistoryService.append({ organizationId, assetId: updated._id.toString(), event, description: "Asset updated", actorId: actor.userId, sourceType: "asset", sourceId: updated._id.toString(), data: { changes: data } });
    }

    return {
      success: true,
      message: "Asset updated successfully",
      data: updated ? toAssetResponse(updated) : null,
    };
  }

  /**
   * Delete Asset
   */
  async delete(assetTag: string, actor: JwtPayload): Promise<ApplicationResult<boolean>> {
    const organizationId = this.accessControl.requireOrganization(actor);
    const facilityId = this.accessControl.requireFacility(actor);

    const asset = await this.repository.findByTag(
      assetTag,
      organizationId,
      facilityId,
    );

    if (!asset) {
      throw new NotFoundException("Asset not found");
    }

    await this.repository.archive(assetTag, organizationId, facilityId);
    await this.cache.deleteByPattern(`${cacheKeys.tenantPrefix(organizationId)}assets:list:*`);
    await this.cache.deleteByPattern(`${cacheKeys.tenantPrefix(organizationId)}dashboard:*`);
    await assetHistoryService.append({ organizationId, assetId: asset._id.toString(), event: ASSET_HISTORY_EVENTS.STATUS_CHANGED, description: "Asset archived", actorId: actor.userId, sourceType: "asset", sourceId: asset._id.toString(), data: { status: "retired" } });

    return {
      success: true,
      message: "Asset deleted successfully",
      data: true,
    };
  }
}
