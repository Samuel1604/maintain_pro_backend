import { VendorRepository } from "./vendor.repository.js";
import type { ApplicationResult } from "@/shared/application-result/index.js";
import type { UpdateVendorProfileInput } from "./vendor.schema.js";
import type { VendorProfile } from "./dto/vendor.dto.js";
import { toVendorProfile } from "./dto/vendor.mapper.js";
import {
  AuthorizationException,
  NotFoundException,
} from "@/shared/errors/index.js";
import { WorkOrder } from "@/modules/work-orders/work-order.model.js";
import { RedisCache } from "@/infrastructure/cache/redis.cache.js";
import { cacheKeys, cacheTtlSeconds } from "@/infrastructure/cache/cache-keys.js";

type Actor = {
  vendorId?: string;
};

/**
 * NOTE: This service used to also have a `create()` method that built a
 * vendor AND its lead user directly, bypassing AuthService entirely — and,
 * as a result, never publishing VendorRegisteredEvent or UserRegisteredEvent.
 * It wasn't wired to any route; the real registration path is
 * AuthService.registerVendor(), which goes through
 * AuthRepository.createVendor() + UserService.createVendorLead() and
 * publishes both events. This was a dead, duplicate, event-less
 * registration path. Removed — vendor registration has exactly one entry
 * point now: AuthService.
 */
export class VendorService {
  constructor(private readonly repository: VendorRepository) {}
  private cache = new RedisCache();

  async findById(vendorId: string): Promise<VendorProfile | null> {
    const v = await this.repository.findById(vendorId);
    return v ? toVendorProfile(v) : null;
  }

  async getVendor(actor: Actor): Promise<ApplicationResult<VendorProfile>> {
    if (!actor.vendorId) {
      throw new AuthorizationException("Vendor context required");
    }
    const key = cacheKeys.vendorProfile(actor.vendorId);
    const cached = await this.cache.get<VendorProfile>(key);
    if (cached) return { success: true, message: "Vendor retrieved successfully", data: cached };
    const vendor = await this.repository.findById(actor.vendorId);

    if (!vendor) {
      throw new NotFoundException("Vendor not found");
    }

    const data = toVendorProfile(vendor);
    await this.cache.set(key, data, cacheTtlSeconds.profile);
    return {
      success: true,
      message: "Vendor retrieved successfully",
      data,
    };
  }

  async updateVendor(
    data: UpdateVendorProfileInput,
    actor: Actor,
  ): Promise<ApplicationResult<VendorProfile>> {
    if (!actor.vendorId) {
      throw new AuthorizationException("Vendor context required");
    }

    const { vendorName, latitude, longitude, serviceAreas: _serviceAreas, ...fields } = data;
    const updates: Record<string, unknown> = { ...fields };
    if (vendorName !== undefined) updates.name = vendorName;
    if (latitude !== undefined || longitude !== undefined) {
      const current = await this.repository.findById(actor.vendorId);
      const previous = current?.baseCoordinates?.coordinates ?? [0, 0];
      updates.baseCoordinates = {
        type: "Point",
        coordinates: [longitude ?? previous[0], latitude ?? previous[1]],
      };
    }
    const updated = await this.repository.update(actor.vendorId, updates);
    await this.cache.delete(cacheKeys.vendorProfile(actor.vendorId));

    if (!updated) {
      throw new NotFoundException("Vendor not found");
    }

    return {
      success: true,
      message: "Vendor profile updated successfully",
      data: toVendorProfile(updated),
    };
  }

  async performance(actor: Actor) {
    if (!actor.vendorId) throw new AuthorizationException("Vendor context required");
    const [total, completed, inProgress, assigned] = await Promise.all([
      WorkOrder.countDocuments({ assignedVendorId: actor.vendorId }),
      WorkOrder.countDocuments({ assignedVendorId: actor.vendorId, status: "completed" }),
      WorkOrder.countDocuments({ assignedVendorId: actor.vendorId, status: "in_progress" }),
      WorkOrder.countDocuments({ assignedVendorId: actor.vendorId, status: "assigned" }),
    ]);
    return { total, completed, inProgress, assigned, completionRate: total ? Math.round((completed / total) * 100) : 0 };
  }

  async delete(vendorId: string) {
    return this.repository.delete(vendorId);
  }
}
