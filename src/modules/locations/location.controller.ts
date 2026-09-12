import type { Request, Response, NextFunction } from "express";
import { LocationService } from "./location.service.js";
import { toLocationResponse } from "./location.mapper.js";
import { Asset } from "@/modules/assets/asset.model.js";
import { AuthorizationException } from "@/shared/errors/index.js";
import { WorkOrder } from "@/modules/work-orders/work-order.model.js";
import { Types } from "mongoose";

export class LocationController {
  constructor(private readonly service: LocationService = new LocationService()) {}

  createLocation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = req.user?.organizationId;
      const location = await this.service.createLocation(organizationId!, req.body);
      res.created(toLocationResponse(location), "Location created successfully");
    } catch (error) {
      next(error);
    }
  };

  getLocationsByFacility = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = req.user?.organizationId;
      const facilityId = req.params.facilityId as string;
      const locations = await this.service.getLocationsByFacility(organizationId!, facilityId);
      res.ok(locations.map(toLocationResponse), "Locations retrieved successfully");
    } catch (error) {
      next(error);
    }
  };

  getLocationsByOrganization = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = req.user?.organizationId;
      const locations = await this.service.getLocationsByOrganization(organizationId!);
      const ids = locations.map((location) => location._id.toString()).filter((id) => Types.ObjectId.isValid(id)).map((id) => new Types.ObjectId(id));
      const organizationObjectId = organizationId && Types.ObjectId.isValid(organizationId) ? new Types.ObjectId(organizationId) : organizationId;
      const [assetCounts, workOrderCounts] = await Promise.all([
        Asset.aggregate([{ $match: { organizationId: organizationObjectId, locationId: { $in: ids } } }, { $group: { _id: "$locationId", count: { $sum: 1 } } }]),
        WorkOrder.aggregate([{ $match: { organizationId: organizationObjectId, locationId: { $in: ids }, status: { $nin: ["completed", "cancelled"] } } }, { $group: { _id: "$locationId", count: { $sum: 1 } } }]),
      ]);
      const counts = (rows: Array<{ _id: unknown; count: number }>) => new Map(rows.map((row) => [String(row._id), row.count]));
      const assets = counts(assetCounts);
      const workOrders = counts(workOrderCounts);
      res.ok(locations.map((location) => ({ ...toLocationResponse(location), assetCount: assets.get(location._id.toString()) ?? 0, openWorkOrderCount: workOrders.get(location._id.toString()) ?? 0 })), "Organization locations retrieved successfully");
    } catch (error) {
      next(error);
    }
  };

  getLocationById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = req.user?.organizationId;
      const id = req.params.id as string;
      const location = await this.service.getLocationById(organizationId!, id);
      res.ok(toLocationResponse(location), "Location retrieved successfully");
    } catch (error) {
      next(error);
    }
  };

  getRelationships = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = req.user?.organizationId;
      const location = await this.service.getLocationById(organizationId!, req.params.id as string);
      const [assets, openWorkOrderCount] = await Promise.all([
        Asset.find({ organizationId, locationId: req.params.id }).limit(100).lean(),
        WorkOrder.countDocuments({ organizationId, locationId: req.params.id, status: { $nin: ["completed", "cancelled"] } }),
      ]);
      res.ok({ location: toLocationResponse(location), assets, assetCount: assets.length, openWorkOrderCount }, "Location relationships retrieved successfully");
    } catch (error) { next(error); }
  };

  getChildren = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = req.user?.organizationId;
      if (!organizationId) throw new AuthorizationException("Organization context required");
      const locations = await this.service.getChildren(organizationId, req.params.id as string);
      res.ok(locations.map(toLocationResponse), "Child locations retrieved successfully");
    } catch (error) { next(error); }
  };

  updateLocation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = req.user?.organizationId;
      const id = req.params.id as string;
      const location = await this.service.updateLocation(organizationId!, id, req.body);
      res.ok(toLocationResponse(location), "Location updated successfully");
    } catch (error) {
      next(error);
    }
  };

  deleteLocation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = req.user?.organizationId;
      const id = req.params.id as string;
      await this.service.deleteLocation(organizationId!, id);
      res.ok(null, "Location deleted successfully");
    } catch (error) {
      next(error);
    }
  };
}
