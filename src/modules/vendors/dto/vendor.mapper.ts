import type { IVendor } from "../vendor.types.js";
import type { VendorProfile } from "./vendor.dto.js";
import { toIsoString, toObjectIdString } from "@/shared/validators/index.js";

export const vendorMapper = {
  toVendorProfile(vendor: IVendor): VendorProfile {
    return {
      id: toObjectIdString(vendor._id)!,
      name: vendor.name,
      slug: vendor.slug,

      email: vendor.email,
      phone: vendor.phone,
      website: vendor.website,
      logo: vendor.logo,

      address: vendor.address,

      companyRegistrationNumber: vendor.companyRegistrationNumber,

      serviceCategories: vendor.serviceCategories || [],
      certifications: vendor.certifications,

      coverageRadiusKm: vendor.coverageRadiusKm,
      baseCoordinates: vendor.baseCoordinates,

      plan: vendor.plan,
      subscriptionStatus: vendor.subscriptionStatus,
      applicationLimit: vendor.applicationLimit,

      averageRating: vendor.averageRating,
      completedJobs: vendor.completedJobs,

      isVerified: vendor.isVerified,
      verificationBadge: vendor.verificationBadge,

      status: vendor.status,

      createdAt: toIsoString(vendor.createdAt),
      updatedAt: toIsoString(vendor.updatedAt),
    };
  },
};

export const toVendorProfile = (vendor: IVendor) => vendorMapper.toVendorProfile(vendor);
