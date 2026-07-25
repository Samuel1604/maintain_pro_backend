import type { Types } from "mongoose";

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface FacilityDto {
  organizationId: Types.ObjectId;
  name: string;
  address: string;
  coordinates: Coordinates;
  city: string;
  state: string;
  country: string;
}
