import { Router } from "express";
import { authMiddleware } from "@/shared/middleware/authenticate.js";
import { WorkOrder } from "@/modules/work-orders/work-order.model.js";
import { Asset } from "@/modules/assets/asset.model.js";
import { Facility } from "@/modules/facilities/facility.model.js";
import { Vendor } from "@/modules/vendors/vendor.model.js";
import { OrganizationVendorRelationship } from "@/modules/organizations/vendor-relationships/organization-vendor.model.js";
import { Location } from "@/modules/locations/location.model.js";
import { ServiceRequest } from "@/modules/service-requests/request.model.js";
import { PMPlan } from "@/modules/preventive-maintenance/pm.model.js";
import { InventoryItem } from "@/modules/inventory/inventory-item.model.js";
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
  const key = cacheKeys.search(
    organizationId ?? req.user.vendorId ?? req.user.userId,
    cacheHash({ query, limit }),
  );
  const cached = await searchCache.get<unknown[]>(key);
  if (cached) return res.ok(cached, "Search results retrieved");
  type WorkOrderRow = Awaited<ReturnType<typeof WorkOrder.find>>[number];
  type AssetRow = Awaited<ReturnType<typeof Asset.find>>[number];
  type FacilityRow = Awaited<ReturnType<typeof Facility.find>>[number];
  type VendorRow = Awaited<ReturnType<typeof Vendor.find>>[number];
  type LocationRow = Awaited<ReturnType<typeof Location.find>>[number];
  type ServiceRequestRow = Awaited<ReturnType<typeof ServiceRequest.find>>[number];
  type PMPlanRow = Awaited<ReturnType<typeof PMPlan.find>>[number];
  type InventoryItemRow = Awaited<ReturnType<typeof InventoryItem.find>>[number];

  const [
    workOrders,
    assets,
    facilities,
    vendors,
    locations,
    serviceRequests,
    pmPlans,
    inventoryItems,
  ] = (
    organizationId
      ? await Promise.all([
          WorkOrder.find({ organizationId, $or: [{ title: pattern }, { description: pattern }] })
            .limit(limit)
            .lean(),
          Asset.find({
            organizationId,
            $or: [{ assetTag: pattern }, { name: pattern }, { serialNumber: pattern }],
          })
            .limit(limit)
            .lean(),
          Facility.find({ organizationId, name: pattern }).limit(limit).lean(),
          Vendor.find({ name: pattern }).limit(limit).lean(),
          Location.find({
            organizationId,
            $or: [{ name: pattern }, { code: pattern }, { description: pattern }],
          })
            .limit(limit)
            .lean(),
          ServiceRequest.find({
            organizationId,
            $or: [{ title: pattern }, { description: pattern }, { serviceCategory: pattern }],
          })
            .limit(limit)
            .lean(),
          PMPlan.find({
            organizationId,
            $or: [{ title: pattern }, { description: pattern }, { maintenanceType: pattern }],
          })
            .limit(limit)
            .lean(),
          InventoryItem.find({
            organizationId,
            $or: [{ name: pattern }, { sku: pattern }, { description: pattern }],
          })
            .limit(limit)
            .lean(),
        ])
      : req.user.vendorId
        ? [
            await WorkOrder.find({
              assignedVendorId: req.user.vendorId,
              $or: [{ title: pattern }, { description: pattern }],
            })
              .limit(limit)
              .lean(),
            [],
            [],
            [],
          ]
        : [[], [], [], [], [], [], [], []]
  ) as [
    WorkOrderRow[],
    AssetRow[],
    FacilityRow[],
    VendorRow[],
    LocationRow[],
    ServiceRequestRow[],
    PMPlanRow[],
    InventoryItemRow[],
  ];
  const vendorIds = vendors.map((vendor) => vendor._id);
  const relationships =
    organizationId && vendorIds.length > 0
      ? await OrganizationVendorRelationship.find({
          organizationId,
          vendorId: { $in: vendorIds },
        }).lean()
      : [];
  const relationshipByVendor = new Map(
    relationships.map((relationship) => [relationship.vendorId.toString(), relationship.status]),
  );
  const results = [
    ...workOrders.map((item) => ({
      id: item._id.toString(),
      title: item.title,
      category: "Work Orders",
      type: "work-orders",
      segment: `work-orders/${item._id}`,
      badge: item.status,
      desc: item.description,
    })),
    ...assets.map((item) => ({
      id: item.assetTag,
      title: item.name,
      category: "Assets",
      type: "assets",
      segment: `assets/${encodeURIComponent(item.assetTag)}`,
      badge: item.status,
      desc: item.description ?? item.serialNumber ?? "",
    })),
    ...facilities.map((item) => ({
      id: item._id.toString(),
      title: item.name,
      category: "Facilities",
      type: "facilities",
      segment: `facilities/${item._id}`,
      badge: item.status,
      desc: item.description ?? "",
    })),
    ...vendors
      .filter((item) => relationshipByVendor.has(item._id.toString()))
      .map((item) => ({
        id: item._id.toString(),
        title: item.name,
        category: "Vendors",
        type: "vendors",
        segment: "vendors",
        badge: relationshipByVendor.get(item._id.toString()) ?? item.status,
        desc: item.serviceCategories?.join(" • ") ?? "",
      })),
    ...locations.map((item) => ({
      id: item._id.toString(),
      title: item.name,
      category: "Locations",
      type: "locations",
      segment: `locations/${item._id}`,
      badge: item.status,
      desc: item.description ?? item.code ?? "",
    })),
    ...serviceRequests.map((item) => ({
      id: item._id.toString(),
      title: item.title,
      category: "Service Requests",
      type: "service-requests",
      segment: `service-requests/${item._id}`,
      badge: item.status,
      desc: item.description ?? item.serviceCategory,
    })),
    ...pmPlans.map((item) => ({
      id: item._id.toString(),
      title: item.title,
      category: "PM Schedules",
      type: "preventive-maintenance",
      segment: `preventive-maintenance/${item._id}`,
      badge: item.status,
      desc: item.description ?? item.maintenanceType,
    })),
    ...inventoryItems.map((item) => ({
      id: item._id.toString(),
      title: item.name,
      category: "Inventory",
      type: "inventory",
      segment: "inventory",
      badge: item.status,
      desc: item.description ?? item.sku,
    })),
  ];
  await searchCache.set(key, results, cacheTtlSeconds.search);
  return res.ok(results, "Search results retrieved");
});

export default router;
