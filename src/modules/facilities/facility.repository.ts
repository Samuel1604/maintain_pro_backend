import { Types } from "mongoose";
import { Facility } from "./facility.model.js";
import type { CreateFacilityInput, UpdateFacilityInput } from "./facility.schema.js";
import type { IFacility } from "./facility.model.js";

export class FacilityRepository {
  async create(data: CreateFacilityInput, createdBy: string): Promise<IFacility> {
    return Facility.create({
      organizationId: new Types.ObjectId(data.organizationId),
      name: data.name,
      address: data.address,
      coordinates: {
        type: "Point",
        coordinates: [data.longitude, data.latitude],
      },
      status: "active",
      description: data.description,
      managerName: data.managerName,
      primaryPhone: data.primaryPhone,
      emergencyContact: data.emergencyContact,
      createdBy: new Types.ObjectId(createdBy),
    });
  }

  async findById(id: string): Promise<IFacility | null> {
    return Facility.findById(id);
  }

  async findByOrganization(organizationId: string): Promise<IFacility[]> {
    return Facility.find({ organizationId }).sort({ createdAt: -1 }).limit(100);
  }

  async findMany(filter: Record<string, unknown>): Promise<IFacility[]> {
    return Facility.find(filter).limit(100);
  }

  async findManyWithSort(
    filter: Record<string, unknown>,
    sort: Record<string, 1 | -1> = { createdAt: -1 },
    skip: number = 0,
    limit: number = 10,
  ): Promise<IFacility[]> {
    return Facility.find(filter).sort(sort).skip(skip).limit(limit).exec();
  }

  async findByOrganizationAndStatus(
    organizationId: string,
    status: "active" | "inactive" | "suspended",
  ): Promise<IFacility[]> {
    return Facility.find({ organizationId, status }).sort({ createdAt: -1 }).limit(100);
  }

  async update(
    id: string,
    data: UpdateFacilityInput,
    updatedBy: string,
  ): Promise<IFacility | null> {
    const updates: Record<string, unknown> = {
      updatedBy: new Types.ObjectId(updatedBy),
    };

    if (data.name !== undefined) updates.name = data.name;
    if (data.address !== undefined) updates.address = data.address;
    if (data.description !== undefined) updates.description = data.description;
    if (data.managerName !== undefined) updates.managerName = data.managerName;
    if (data.primaryPhone !== undefined) updates.primaryPhone = data.primaryPhone;
    if (data.emergencyContact !== undefined) updates.emergencyContact = data.emergencyContact;
    if (data.status !== undefined) updates.status = data.status;

    if (data.latitude !== undefined && data.longitude !== undefined) {
      updates.coordinates = {
        type: "Point",
        coordinates: [data.longitude, data.latitude],
      };
    }

    return Facility.findByIdAndUpdate(id, updates, { returnDocument: "after" });
  }

  async delete(id: string): Promise<void> {
    await Facility.findByIdAndDelete(id);
  }

  async count(filter: Record<string, unknown>): Promise<number> {
    return Facility.countDocuments(filter);
  }

  async countByStatus(organizationId: string): Promise<Record<string, number>> {
    const rows = await Facility.aggregate([
      { $match: { organizationId: new Types.ObjectId(organizationId) } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    return rows.reduce<Record<string, number>>((result, row: { _id: string; count: number }) => {
      result[row._id] = row.count;
      return result;
    }, {});
  }

  async exists(filter: Record<string, unknown>): Promise<boolean> {
    const result = await Facility.exists(filter);
    return Boolean(result);
  }
}
