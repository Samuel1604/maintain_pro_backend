import { User } from "@/modules/users/user.model.js";
import { Organization } from "@/modules/organizations/organization.model.js";
import { Vendor } from "@/modules/vendors/vendor.model.js";

import type { RegisterOrgDto, RegisterVendorDto } from "./dto/auth.dto.js";

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
    return User.findByIdAndUpdate(userId, data, { new: true });
  }

  // -------------------------
  // ORGANIZATION
  // -------------------------

  createOrganization(data: RegisterOrgDto) {
    return Organization.create({
      name: data.organizationName,
      industry: data.industry,

      email: data.email,
      phone: data.phone,

      address: data.address,

      plan: data.plan,

      subscriptionStatus: "trial",

      facilityLimit: data.plan === "free" ? 1 : 9999,

      facilityManagerLimit: data.plan === "free" ? 1 : 9999,

      vendorMarketplaceEnabled: data.plan !== "free",
    });
  }

  // -------------------------
  // VENDOR
  // -------------------------

  createVendor(data: RegisterVendorDto) {
    return Vendor.create({
      name: data.vendorName,

      email: data.email,
      phone: data.phone,

      address: data.address,

      plan: data.plan,

      subscriptionStatus: "trial",

      applicationLimit: data.plan === "free" ? 10 : 9999,
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
        new: true,
      },
    );
  }
}
