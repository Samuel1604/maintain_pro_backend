import type { IOrganization } from "../organization.types.js";

type OrganizationStatus = IOrganization["status"];

export interface OrganizationProfile {
  id: string;
  slug: string;
  name: string;
  industry: string;

  email: string;
  phone: string;
  website?: string;

  address: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };

  logo?: string;

  status: OrganizationStatus;

  createdAt: string;
  updatedAt: string;
}
