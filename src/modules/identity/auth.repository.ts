import { User } from "@/modules/users/user.model.js";
import { Organization } from "@/modules/organizations/organization.model.js";
import { Vendor } from "@/modules/vendors/vendor.model.js";
import { uniqueOrganizationSlug, uniqueVendorSlug } from "@/shared/utils/slug.js";

import type { RegisterOrgDto, RegisterVendorDto } from "./auth.schema.js";
import type {
  OAuthRegisterOrgDto,
  OAuthRegisterVendorDto,
} from "./auth.schema.js";

export class AuthRepository {
  // -------------------------
  // USER
  // -------------------------

  findUserByEmail(email: string) {
    return User.findOne({
      email: email.toLowerCase(),
    });
  }

  findUserById(userId: string) {
    return User.findById(userId);
  }

  createUser(data: Record<string, unknown>) {
    return User.create(data);
  }

  updateUser(userId: string, data: Record<string, unknown>) {
    return User.findByIdAndUpdate(userId, data, {
      returnDocument: "after",
    });
  }

  // -------------------------
  // ORGANIZATION
  // -------------------------

  async createOrganization(data: RegisterOrgDto | OAuthRegisterOrgDto) {
    return Organization.create({
      name: data.organizationName,
      slug: await uniqueOrganizationSlug(data.organizationName),
      industry: data.industry,

      email: data.email,
      phone: data.phone,

      address: data.address,
    });
  }

  // -------------------------
  // VENDOR
  // -------------------------

  async createVendor(data: RegisterVendorDto | OAuthRegisterVendorDto) {
    return Vendor.create({
      name: data.vendorName,
      slug: await uniqueVendorSlug(data.vendorName),

      email: data.email,
      phone: data.phone,

      address: data.address,
    });
  }

  // -------------------------
  // PASSWORD
  // -------------------------
  async updatePassword(userId: string, password: string) {
    return User.findByIdAndUpdate(
      userId,
      {
        password,
        passwordChangedAt: new Date(),
      },
      {
        returnDocument: "after",
      },
    );
  }
}
