import type { IOrganization } from "./organization.types.js";
import type { OrganizationProfile } from "./dto/organization-profile.dto.js";

import { toIsoString, toObjectIdString } from "@/shared/validators/index.js";

export const organizationMapper = {
  toOrganizationProfile(organization: IOrganization): OrganizationProfile {
    return {
      id: toObjectIdString(organization._id)!,
      name: organization.name,
      slug: organization.slug,
      industry: organization.industry,

      email: organization.email,
      phone: organization.phone,
      website: organization.website,

      address: organization.address,

      logo: organization.logo,

      status: organization.status,

      createdAt: toIsoString(organization.createdAt)!,
      updatedAt: toIsoString(organization.updatedAt)!,
    };
  },
};

export const toOrganizationProfile = (organization: IOrganization) =>
  organizationMapper.toOrganizationProfile(organization);
