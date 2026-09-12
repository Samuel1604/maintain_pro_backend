import { OrganizationRepository } from "./organization.repository.js";
import type { ApplicationResult } from "@/shared/application-result/index.js";
import type { OrganizationProfile } from "./dto/organization-profile.dto.js";
import { toOrganizationProfile } from "./organization.mapper.js";
import {
  AuthorizationException,
  NotFoundException,
} from "@/shared/errors/index.js";
import { RedisCache } from "@/infrastructure/cache/redis.cache.js";
import { cacheKeys, cacheTtlSeconds } from "@/infrastructure/cache/cache-keys.js";

type Actor = {
  organizationId?: string;
};

/**
 * NOTE: This service used to also have a `create()` method that built an
 * organization AND its admin user directly, bypassing AuthService entirely
 * — and, as a result, never publishing OrganizationRegisteredEvent or
 * UserRegisteredEvent. It wasn't wired to any route (no controller called
 * it); the real registration path is AuthService.registerOrganization(),
 * which goes through AuthRepository.createOrganization() +
 * UserService.createOrganizationAdmin() and publishes both events. This
 * was a dead, duplicate, event-less registration path. Removed —
 * organization registration has exactly one entry point now: AuthService.
 */
export class OrganizationService {
  constructor(private readonly repository: OrganizationRepository) {}
  private cache = new RedisCache();

  async findById(organizationId: string) {
    const org = await this.repository.findById(organizationId);
    return org ? toOrganizationProfile(org) : null;
  }

  async getOrganization(
    actor: Actor,
  ): Promise<ApplicationResult<OrganizationProfile>> {
    if (!actor.organizationId) {
      throw new AuthorizationException("Organization context required");
    }
    const key = cacheKeys.organizationProfile(actor.organizationId);
    const cached = await this.cache.get<OrganizationProfile>(key);
    if (cached) return { success: true, message: "Organization retrieved successfully", data: cached };
    const organization = await this.repository.findById(actor.organizationId);
    if (!organization) {
      throw new NotFoundException("Organization not found");
    }

    const data = toOrganizationProfile(organization);
    await this.cache.set(key, data, cacheTtlSeconds.profile);
    return {
      success: true,
      message: "Organization retrieved successfully",
      data,
    };
  }

  async update(organizationId: string, updates: Record<string, unknown>) {
    const organization = await this.repository.update(organizationId, updates);
    await this.cache.delete(cacheKeys.organizationProfile(organizationId));
    return organization ? toOrganizationProfile(organization) : null;
  }

  async delete(organizationId: string) {
    return this.repository.delete(organizationId);
  }
}
