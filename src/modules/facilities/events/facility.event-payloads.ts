export interface FacilityCreatedPayload {
  facilityId: string;
  organizationId: string;
  name: string;
  address: {
    street: string;
    city: string;
    state: string;
    postalCode?: string;
    country: string;
  };
  description?: string;
  managerName?: string;
  primaryPhone?: string;
  emergencyContact?: string;
  createdBy: string;
}

export interface FacilityUpdatedPayload {
  facilityId: string;
  organizationId: string;
  name?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  description?: string;
  managerName?: string;
  primaryPhone?: string;
  emergencyContact?: string;
  status?: "active" | "inactive" | "suspended";
  updatedBy: string;
}

export interface FacilityDeactivatedPayload {
  facilityId: string;
  organizationId: string;
  deactivatedBy: string;
}

export interface FacilityDeletedPayload {
  facilityId: string;
  organizationId: string;
  deletedBy: string;
}
