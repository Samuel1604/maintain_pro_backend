import { ServiceRequest } from "./request.model.js";
import type { ClientSession } from "mongoose";

export class ServiceRequestRepository {
  async create(data: Record<string, unknown>, session?: ClientSession) {
    if (session) {
      const [created] = await ServiceRequest.create([data], { session });
      if (!created) throw new Error("Service request was not created");
      return created;
    }
    return ServiceRequest.create(data);
  }

  findById(id: string) {
    return ServiceRequest.findById(id)
      .populate("facilityId", "name")
      .populate("locationId", "name")
      .populate("assetId", "name")
      .populate("requestedBy", "firstName lastName");
  }

  async findByOrganization(organizationId: string) {
    return ServiceRequest.find({ organizationId }).sort({ createdAt: -1 }).limit(100);
  }

  findPage(filter: Record<string, unknown>, skip: number, limit: number) {
    return ServiceRequest.find(filter)
      .populate("facilityId", "name")
      .populate("locationId", "name")
      .populate("assetId", "name")
      .populate("requestedBy", "firstName lastName")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
  }

  count(filter: Record<string, unknown>) {
    return ServiceRequest.countDocuments(filter);
  }
}
