import { Location, type ILocation } from "./location.model.js";
import { toObjectId } from "@/shared/validators/index.js";

export class LocationRepository {
  async create(data: Partial<ILocation>): Promise<ILocation> {
    const location = new Location(data);
    return location.save();
  }

  async findById(id: string): Promise<ILocation | null> {
    return Location.findById(toObjectId(id));
  }

  async findByFacility(facilityId: string, organizationId: string): Promise<ILocation[]> {
    return Location.find({
      facilityId: toObjectId(facilityId),
      organizationId: toObjectId(organizationId),
    }).sort({ name: 1 }).limit(100);
  }

  async findByOrganization(organizationId: string): Promise<ILocation[]> {
    return Location.find({
      organizationId: toObjectId(organizationId),
    }).sort({ name: 1 }).limit(100);
  }

  async findByNameInFacility(facilityId: string, name: string): Promise<ILocation | null> {
    return Location.findOne({
      facilityId: toObjectId(facilityId),
      name: { $regex: new RegExp(`^${name}$`, "i") },
    });
  }

  async findChildren(id: string): Promise<ILocation[]> {
    return Location.find({ parentId: toObjectId(id) }).limit(100);
  }

  async findByParent(id: string, organizationId: string): Promise<ILocation[]> {
    return Location.find({ parentId: toObjectId(id), organizationId: toObjectId(organizationId) }).sort({ name: 1 }).limit(100);
  }

  async hasDescendant(id: string, possibleDescendantId: string): Promise<boolean> {
    let current = await this.findById(possibleDescendantId);
    while (current?.parentId) {
      if (current.parentId.toString() === id) return true;
      current = await this.findById(current.parentId.toString());
    }
    return false;
  }

  async update(id: string, data: Partial<ILocation>): Promise<ILocation | null> {
    return Location.findByIdAndUpdate(toObjectId(id), data, { new: true });
  }

  async delete(id: string): Promise<boolean> {
    const res = await Location.findByIdAndUpdate(toObjectId(id), { status: "inactive" }, { new: true });
    return !!res;
  }
}
