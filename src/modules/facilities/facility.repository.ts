import { Types } from "mongoose";
import { Facility } from "./facility.model.js";
import type { CreateFacilityInput } from "./facility.schema.js";

export class FacilityRepository {
  create(data: CreateFacilityInput) {
    return Facility.create({
      organizationId: new Types.ObjectId(data.organizationId),
      name: data.name,
      address: data.address,
      coordinates: {
        type: "Point",
        coordinates: [data.longitude, data.latitude],
      },
      city: data.city,
      state: data.state,
      country: data.country,
    });
  }

  findByOrganization(organizationId: string) {
    return Facility.find({ organizationId }).sort({ createdAt: -1 });
  }

  findById(id: string) {
    return Facility.findById(id);
  }
}
