export interface FacilityResponse {
  id: string;
  organizationId: string;
  name: string;
  address: {
    street: string;
    city: string;
    state: string;
    postalCode?: string;
    country: string;
  };
  coordinates: {
    type: "Point";
    coordinates: [number, number];
  };
  status: "active" | "inactive" | "suspended";
  description?: string;
  managerName?: string;
  primaryPhone?: string;
  emergencyContact?: string;
  createdAt: string;
  updatedAt: string;
  /** Relationship totals are included by the paginated list endpoint. */
  locationCount?: number;
  assetCount?: number;
  openWorkOrderCount?: number;
}

export interface CreateFacilityRequest {
  name: string;
  address: {
    street: string;
    city: string;
    state: string;
    postalCode?: string;
    country: string;
  };
  latitude: number;
  longitude: number;
  description?: string;
  managerName?: string;
  primaryPhone?: string;
  emergencyContact?: string;
}

export interface UpdateFacilityRequest {
  name?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  latitude?: number;
  longitude?: number;
  description?: string | null;
  managerName?: string | null;
  primaryPhone?: string | null;
  emergencyContact?: string | null;
  status?: "active" | "inactive" | "suspended";
}

export interface ListFacilitiesRequest {
  page?: number;
  limit?: number;
  status?: "active" | "inactive" | "suspended";
  sort?: "name" | "createdAt" | "-createdAt";
}

export interface PaginationMetadata {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface ListFacilitiesResponse {
  data: FacilityResponse[];
  pagination: PaginationMetadata;
}
