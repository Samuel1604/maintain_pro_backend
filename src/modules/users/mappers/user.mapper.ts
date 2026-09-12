import type { IUser } from "../user.types.js";
import type { AuthenticatedUser } from "../dto/authenticated-user.dto.js";
import type { UserSummary } from "../dto/user-summary.dto.js";
import type { UserProfile } from "../dto/user-profile.dto.js";

import { toIsoString, toObjectIdString } from "@/shared/validators/index.js";

export const userMapper = {
  toAuthenticatedUser(user: IUser): AuthenticatedUser {
    return {
      id: toObjectIdString(user._id)!,
      role: user.role,
      organizationId: toObjectIdString(user.organizationId),
      vendorId: toObjectIdString(user.vendorId),
      facilityId: toObjectIdString(user.facilityId),
    };
  },

  toUserSummary(user: IUser): UserSummary {
    return {
      id: toObjectIdString(user._id)!,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      avatar: user.avatar,
      role: user.role,
      status: user.status,
      isVerified: user.isVerified,
    };
  },

  toUserProfile(user: IUser, organizationSlug?: string, vendorSlug?: string): UserProfile {
    return {
      id: toObjectIdString(user._id)!,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
      role: user.role,
      provider: user.provider,
      status: user.status,
      organizationId: toObjectIdString(user.organizationId),
      vendorId: toObjectIdString(user.vendorId),
      facilityId: toObjectIdString(user.facilityId),
      organizationSlug,
      vendorSlug,
      isVerified: user.isVerified,
      createdAt: toIsoString(user.createdAt),
      updatedAt: toIsoString(user.updatedAt),
    };
  },
};

export const toAuthenticatedUser = (user: IUser) =>
  userMapper.toAuthenticatedUser(user);
export const toUserSummary = (user: IUser) => userMapper.toUserSummary(user);
export const toUserProfile = (user: IUser, organizationSlug?: string, vendorSlug?: string) =>
  userMapper.toUserProfile(user, organizationSlug, vendorSlug);
