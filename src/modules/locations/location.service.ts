import { LocationRepository } from "./location.repository.js";
import { FacilityRepository } from "@/modules/facilities/facility.repository.js";
import { NotFoundException, ConflictException, ValidationException } from "@/shared/errors/index.js";
import type { CreateLocationInput, UpdateLocationInput } from "./location.schema.js";
import type { ILocation } from "./location.model.js";
import { toObjectId } from "@/shared/validators/index.js";

export class LocationService {
  constructor(
    private readonly repository: LocationRepository = new LocationRepository(),
    private readonly facilityRepository: FacilityRepository = new FacilityRepository(),
  ) {}

  async createLocation(organizationId: string, input: CreateLocationInput): Promise<ILocation> {
    const facility = await this.facilityRepository.findById(input.facilityId);
    if (!facility || facility.organizationId.toString() !== organizationId) {
      throw new NotFoundException("Facility not found in your organization.");
    }

    if (input.parentId) {
      const parent = await this.repository.findById(input.parentId);
      if (!parent || parent.organizationId.toString() !== organizationId || parent.facilityId.toString() !== input.facilityId) throw new ValidationException("Parent location must belong to the same facility");
    }
    const existing = await this.repository.findByNameInFacility(input.facilityId, input.name);
    if (existing) {
      throw new ConflictException(`Location with name "${input.name}" already exists in this facility.`);
    }

    return this.repository.create({
      organizationId: toObjectId(organizationId),
      facilityId: toObjectId(input.facilityId),
      name: input.name,
      type: input.type,
      parentId: input.parentId ? toObjectId(input.parentId) : undefined,
      code: input.code,
      floor: input.floor,
      roomNumber: input.roomNumber,
      description: input.description,
      status: input.status,
    });
  }

  async getLocationById(organizationId: string, locationId: string): Promise<ILocation> {
    const location = await this.repository.findById(locationId);
    if (!location || location.organizationId.toString() !== organizationId) {
      throw new NotFoundException("Location not found.");
    }
    return location;
  }

  async getLocationsByFacility(organizationId: string, facilityId: string): Promise<ILocation[]> {
    const facility = await this.facilityRepository.findById(facilityId);
    if (!facility || facility.organizationId.toString() !== organizationId) {
      throw new NotFoundException("Facility not found in your organization.");
    }
    return this.repository.findByFacility(facilityId, organizationId);
  }

  async getLocationsByOrganization(organizationId: string): Promise<ILocation[]> {
    return this.repository.findByOrganization(organizationId);
  }

  async getChildren(organizationId: string, locationId: string): Promise<ILocation[]> {
    await this.getLocationById(organizationId, locationId);
    return this.repository.findByParent(locationId, organizationId);
  }

  async updateLocation(
    organizationId: string,
    locationId: string,
    input: UpdateLocationInput,
  ): Promise<ILocation> {
    const location = await this.getLocationById(organizationId, locationId);

    if (input.name && input.name !== location.name) {
      const existing = await this.repository.findByNameInFacility(location.facilityId.toString(), input.name);
      if (existing && existing._id.toString() !== locationId) {
        throw new ConflictException(`Location with name "${input.name}" already exists in this facility.`);
      }
    }
    if (input.parentId !== undefined) {
      if (input.parentId === locationId) throw new ValidationException("A location cannot be its own parent");
      if (input.parentId) {
        const parent = await this.repository.findById(input.parentId);
        if (!parent || parent.organizationId.toString() !== organizationId || parent.facilityId.toString() !== location.facilityId.toString()) throw new ValidationException("Parent location must belong to the same facility");
        if (await this.repository.hasDescendant(locationId, input.parentId)) throw new ValidationException("Location hierarchy cannot contain a cycle");
      }
    }

    const updated = await this.repository.update(locationId, { ...input, parentId: input.parentId === undefined ? undefined : input.parentId ? toObjectId(input.parentId) : undefined });
    return updated!;
  }

  async deleteLocation(organizationId: string, locationId: string): Promise<void> {
    await this.getLocationById(organizationId, locationId);
    const children = await this.repository.findChildren(locationId);
    if (children.some((child) => child.status === "active")) throw new ConflictException("Cannot archive a location with active child locations");
    await this.repository.delete(locationId);
  }
}
