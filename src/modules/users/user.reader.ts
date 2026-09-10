import { UserRepository } from "./user.repository.js";
import type { IUser } from "./user.types.js";
import type { UserRole } from "@/shared/constants/roles.js";
import type { UserProfile } from "./dto/user-profile.dto.js";
import type { UserSummary } from "./dto/user-summary.dto.js";
import { Organization } from "@/modules/organizations/organization.model.js";
import { Vendor } from "@/modules/vendors/vendor.model.js";
import { uniqueOrganizationSlug, uniqueVendorSlug } from "@/shared/utils/slug.js";
import type { Types } from "mongoose";

import { toUserProfile, toUserSummary } from "./mappers/user.mapper.js";

import {
  NotFoundException,
  AuthorizationException,
} from "@/shared/errors/index.js";

import { ROLES } from "@/shared/constants/roles.js";

type Actor = {
  userId: string;
  role: UserRole;
};

const organizationReaderRoles: Partial<UserRole[]> = [
  ROLES.ADMIN,
  ROLES.FACILITY_MANAGER,
  ROLES.FINANCE,
];

const vendorReaderRoles: Partial<UserRole[]> = [ROLES.VENDOR_LEAD, ROLES.VENDOR_MANAGER];

export class UserReader {
  constructor(private readonly repository: UserRepository) {}

  private async resolveOrganizationSlug(organizationId: Types.ObjectId | undefined): Promise<string | undefined> {
    if (!organizationId) return undefined;
    const org = await Organization.findById(organizationId);
    if (!org) return undefined;
    if (!org.slug) {
      const generatedSlug = await uniqueOrganizationSlug(org.name);
      org.slug = generatedSlug;
      await org.save();
      return generatedSlug;
    }
    return org.slug;
  }

  private async resolveVendorSlug(vendorId: Types.ObjectId | undefined): Promise<string | undefined> {
    if (!vendorId) return undefined;
    const vend = await Vendor.findById(vendorId);
    if (!vend) return undefined;
    if (!vend.slug) {
      const generatedSlug = await uniqueVendorSlug(vend.name);
      vend.slug = generatedSlug;
      await vend.save();
      return generatedSlug;
    }
    return vend.slug;
  }

  /**
   * Public user profile lookup.
   * Used by controllers/application layer.
   */
  async findById(userId: string): Promise<UserProfile | null> {
    const user = await this.repository.findById(userId);

    if (!user) {
      return null;
    }

    const organizationSlug = await this.resolveOrganizationSlug(user.organizationId);
    const vendorSlug = await this.resolveVendorSlug(user.vendorId);

    return toUserProfile(user, organizationSlug, vendorSlug);
  }

  /**
   * Public email lookup.
   * Does not expose database model.
   */
  async findByEmail(email: string): Promise<UserProfile | null> {
    const user = await this.repository.findByEmail(email);

    if (!user) {
      return null;
    }

    const organizationSlug = await this.resolveOrganizationSlug(user.organizationId);
    const vendorSlug = await this.resolveVendorSlug(user.vendorId);

    return toUserProfile(user, organizationSlug, vendorSlug);
  }

  async existsByEmail(email: string): Promise<boolean> {
    return this.repository.existsByEmail(email);
  }

  /**
   * Required user lookup by id or email.
   */
  async getRequiredUser(identifier: string): Promise<IUser> {
    const user = identifier.includes("@")
      ? await this.repository.findByEmail(identifier)
      : await this.repository.findById(identifier);

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return user;
  }



  /**
   * Current authenticated user profile.
   */
  async getMe(actor: Actor): Promise<UserProfile> {
    const user = await this.repository.findById(actor.userId);

    if (!user) {
      throw new NotFoundException("User not found");
    }

    const organizationSlug = await this.resolveOrganizationSlug(user.organizationId);
    const vendorSlug = await this.resolveVendorSlug(user.vendorId);

    return toUserProfile(user, organizationSlug, vendorSlug);
  }

  /**
   * Account members listing.
   *
   * Organization users:
   * admin
   * facility manager
   * finance
   *
   * Vendor users:
   * vendor lead
   * vendor manager
   */
  async listUsers(actor: Actor): Promise<UserSummary[]> {
    const user = await this.repository.findById(actor.userId);

    if (!user) {
      throw new NotFoundException("User not found");
    }

    if (organizationReaderRoles.includes(actor.role)) {
      if (!user.organizationId) {
        throw new AuthorizationException(
          "User is not attached to an organization",
        );
      }

      const users = await this.repository.findOrganizationUsers(
        user.organizationId.toString(),
      );

      return users.map(toUserSummary);
    }

    if (vendorReaderRoles.includes(actor.role)) {
      if (!user.vendorId) {
        throw new AuthorizationException("User is not attached to a vendor");
      }

      const users = await this.repository.findVendorUsers(
        user.vendorId.toString(),
      );

      return users.map(toUserSummary);
    }

    throw new AuthorizationException("This role cannot list account users");
  }

}
