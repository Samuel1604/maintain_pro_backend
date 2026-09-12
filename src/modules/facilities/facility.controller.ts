import { requestHandler } from "@/shared/utils/request.js";
import type { AuthRequest } from "@/shared/types/request.js";
import {
  createFacilitySchema,
  listFacilitiesSchema,
} from "./facility.schema.js";
import { facilityService as service } from "@/container/index.js";
import { Location } from "@/modules/locations/location.model.js";
import { Asset } from "@/modules/assets/asset.model.js";
import { WorkOrder } from "@/modules/work-orders/work-order.model.js";
import { Types } from "mongoose";

export const createFacility = requestHandler<AuthRequest>(async (req, res) => {
  const data = createFacilitySchema.parse(req.body);
  const result = await service.create(data, req.user);

  return res.created(result.data, result.message);
});

export const listFacilities = requestHandler<AuthRequest>(async (req, res) => {
  const options = listFacilitiesSchema.parse(req.query);
  const result = await service.findByOrganizationPaginated(
    req.user.organizationId ?? "",
    options,
  );
  if (!result.data) throw new Error("Facility list could not be loaded");
  const page = result.data;

  const facilityIds = page.data.map((facility) => facility.id);
  const facilityObjectIds = facilityIds.filter((id) => Types.ObjectId.isValid(id)).map((id) => new Types.ObjectId(id));
  const organizationId = req.user.organizationId;
  const organizationObjectId = organizationId && Types.ObjectId.isValid(organizationId) ? new Types.ObjectId(organizationId) : organizationId;
  const [locationCounts, assetCounts, workOrderCounts] = await Promise.all([
    Location.aggregate([{ $match: { organizationId: organizationObjectId, facilityId: { $in: facilityObjectIds } } }, { $group: { _id: "$facilityId", count: { $sum: 1 } } }]),
    Asset.aggregate([{ $match: { organizationId: organizationObjectId, facilityId: { $in: facilityObjectIds } } }, { $group: { _id: "$facilityId", count: { $sum: 1 } } }]),
    WorkOrder.aggregate([{ $match: { organizationId: organizationObjectId, facilityId: { $in: facilityObjectIds }, status: { $nin: ["completed", "cancelled"] } } }, { $group: { _id: "$facilityId", count: { $sum: 1 } } }]),
  ]);
  const countMap = (rows: Array<{ _id: unknown; count: number }>) => new Map(rows.map((row) => [String(row._id), row.count]));
  const locations = countMap(locationCounts);
  const assets = countMap(assetCounts);
  const workOrders = countMap(workOrderCounts);
  return res.ok({ ...page, data: page.data.map((facility) => ({
    ...facility,
    locationCount: locations.get(facility.id) ?? 0,
    assetCount: assets.get(facility.id) ?? 0,
    openWorkOrderCount: workOrders.get(facility.id) ?? 0,
  })) }, result.message);
});

export const getFacility = requestHandler<AuthRequest>(async (req, res) => {
  const result = await service.findById(req.params.facilityId, req.user);
  return res.ok(result.data, result.message);
});

export const getFacilityStatistics = requestHandler<AuthRequest>(async (req, res) => {
  const result = await service.statistics(req.user.organizationId ?? "");
  return res.ok(result.data, result.message);
});

export const getFacilityRelationships = requestHandler<AuthRequest>(async (req, res) => {
  const facility = await service.findById(req.params.facilityId, req.user);
  const [locations, assets, openWorkOrderCount] = await Promise.all([
    Location.find({ facilityId: req.params.facilityId, organizationId: req.user.organizationId }).limit(100).lean(),
    Asset.find({ facilityId: req.params.facilityId, organizationId: req.user.organizationId }).limit(100).lean(),
    WorkOrder.countDocuments({ facilityId: req.params.facilityId, organizationId: req.user.organizationId, status: { $nin: ["completed", "cancelled"] } }),
  ]);
  return res.ok({ facility: facility.data, locations, assets, locationCount: locations.length, assetCount: assets.length, openWorkOrderCount }, "Facility relationships retrieved");
});

export const updateFacility = requestHandler<AuthRequest>(async (req, res) => {
  const data = (
    await import("./facility.schema.js")
  ).updateFacilitySchema.parse(req.body);
  const result = await service.update(req.params.facilityId, data, req.user);
  return res.ok(result.data, result.message);
});

export const deactivateFacility = requestHandler<AuthRequest>(
  async (req, res) => {
    const result = await service.deactivate(req.params.facilityId, req.user);
    return res.ok(result.data, result.message);
  },
);
