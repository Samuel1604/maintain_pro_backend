import type { IFacility } from "../facility.model.js";
import type { FacilityResponse, ListFacilitiesResponse } from "./facility.dto.js";
import { toIsoString, toObjectIdString } from "@/shared/validators/index.js";

export const facilityMapper = {
  toResponse(facility: IFacility): FacilityResponse {
    return {
      id: toObjectIdString(facility._id)!,
      organizationId: toObjectIdString(facility.organizationId)!,
      name: facility.name,
      address: facility.address,
      coordinates: facility.coordinates,
      status: facility.status,
      description: facility.description,
      managerName: facility.managerName,
      primaryPhone: facility.primaryPhone,
      emergencyContact: facility.emergencyContact,
      createdAt: toIsoString(facility.createdAt)!,
      updatedAt: toIsoString(facility.updatedAt)!,
    };
  },

  toResponseArray(facilities: IFacility[]): FacilityResponse[] {
    return facilities.map((f) => facilityMapper.toResponse(f));
  },

  toPaginatedResponse(
    facilities: IFacility[],
    pagination: { page: number; limit: number; total: number; pages: number },
  ): ListFacilitiesResponse {
    return {
      data: facilityMapper.toResponseArray(facilities),
      pagination,
    };
  },
};

export const toFacilityResponse = (facility: IFacility) => facilityMapper.toResponse(facility);

export const toFacilityResponseArray = (facilities: IFacility[]) =>
  facilityMapper.toResponseArray(facilities);

export const toFacilityPaginatedResponse = (
  facilities: IFacility[],
  pagination: { page: number; limit: number; total: number; pages: number },
) => facilityMapper.toPaginatedResponse(facilities, pagination);
