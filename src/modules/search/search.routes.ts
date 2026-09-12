import { Router } from "express";
import { authMiddleware } from "@/shared/middleware/authenticate.js";
import { WorkOrder } from "@/modules/work-orders/work-order.model.js";
import { Asset } from "@/modules/assets/asset.model.js";
import { Facility } from "@/modules/facilities/facility.model.js";
import { Vendor } from "@/modules/vendors/vendor.model.js";
import { OrganizationVendorRelationship } from "@/modules/organizations/vendor-relationships/organization-vendor.model.js";
import { RedisCache } from "@/infrastructure/cache/redis.cache.js";
import { cacheKeys, cacheTtlSeconds } from "@/infrastructure/cache/cache-keys.js";
import { cacheHash } from "@/shared/utils/cache-hash.js";

const router = Router();
router.use(authMiddleware);
const searchCache = new RedisCache();

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

router.get("/", async (req, res) => {
  const query = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 8));
  if (!req.user) return res.status(401).json({ message: "Authentication required" });
  if (!query) return res.ok([], "Search results retrieved");
  const pattern = { $regex: escapeRegex(query), $options: "i" };
  const organizationId = req.user.organizationId;
  const key = cacheKeys.search(organizationId ?? req.user.vendorId ?? req.user.userId, cacheHash({ query, limit }));
  const cached = await searchCache.get<unknown[]>(key);
  if (cached) return res.ok(cached, "Search results retrieved");
  const [workOrders, assets, facilities, vendors] = organizationId
    ? await Promise.all([
      WorkOrder.find({ organizationId, $or: [{ title: pattern }, { description: pattern }] }).limit(limit).lean(),
      Asset.find({ organizationId, $or: [{ assetTag: pattern }, { name: pattern }, { serialNumber: pattern }] }).limit(limit).lean(),
      Facility.find({ organizationId, name: pattern }).limit(limit).lean(),
      Vendor.find({ name: pattern }).limit(limit).lean(),
    ])
    : req.user.vendorId
      ? [
        await WorkOrder.find({ assignedVendorId: req.user.vendorId, $or: [{ title: pattern }, { description: pattern }] }).limit(limit).lean(),
        [],
        [],
        [],
      ]
      : [[], [], [], []];
  const vendorIds = vendors.map((vendor) => vendor._id);
  const relationships = organizationId && vendorIds.length > 0
    ? await OrganizationVendorRelationship.find({ organizationId, vendorId: { $in: vendorIds } }).lean()
    : [];
  const relationshipByVendor = new Map(relationships.map((relationship) => [relationship.vendorId.toString(), relationship.status]));
  const results = [
    ...workOrders.map((item) => ({ id: item._id.toString(), title: item.title, category: "Work Orders", type: "work-orders", segment: `work-orders/${item._id}`, badge: item.status, desc: item.description })),
    ...assets.map((item) => ({ id: item.assetTag, title: item.name, category: "Assets", type: "assets", segment: `assets/${encodeURIComponent(item.assetTag)}`, badge: item.status, desc: item.description ?? item.serialNumber ?? "" })),
    ...facilities.map((item) => ({ id: item._id.toString(), title: item.name, category: "Facilities", type: "facilities", segment: `facilities/${item._id}`, badge: item.status, desc: item.description ?? "" })),
    ...vendors.filter((item) => relationshipByVendor.has(item._id.toString())).map((item) => ({ id: item._id.toString(), title: item.name, category: "Vendors", type: "vendors", segment: "vendors", badge: relationshipByVendor.get(item._id.toString()) ?? item.status, desc: item.serviceCategories?.join(" • ") ?? "" })),
  ];
  await searchCache.set(key, results, cacheTtlSeconds.search);
  return res.ok(results, "Search results retrieved");
});

export default router;
