export interface CreateFacilityDto {
  organizationId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  city: string;
  state: string;
  country: string;
}
