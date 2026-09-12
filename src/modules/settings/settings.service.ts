import { AuthorizationException } from "@/shared/errors/index.js";
import { OrganizationSettings, UserSettings, VendorSettings } from "./settings.model.js";
import type { z } from "zod";
import type { userSettingsSchema, organizationSettingsSchema, vendorSettingsSchema } from "./settings.schema.js";
import type { Cache } from "@/infrastructure/cache/cache.interface.js";
import { RedisCache } from "@/infrastructure/cache/redis.cache.js";
import { cacheKeys, cacheTtlSeconds } from "@/infrastructure/cache/cache-keys.js";

type Actor = { userId: string; role: string; organizationId?: string; vendorId?: string };
const organizationManagers = new Set(["admin", "facility_manager"]);
const vendorManagers = new Set(["vendor_lead", "vendor_manager"]);
const organizationReaders = new Set(["admin", "facility_manager", "finance"]);

export class SettingsService {
  constructor(private readonly cache: Cache = new RedisCache()) {}
  async getUser(actor: Actor) { const key = cacheKeys.userSettings(actor.userId); const cached = await this.cache.get<unknown>(key); if (cached) return cached; const value = await UserSettings.findOne({ userId: actor.userId }).lean() ?? this.userDefaults(actor.userId); await this.cache.set(key, value, cacheTtlSeconds.settings); return value; }
  async updateUser(actor: Actor, input: z.infer<typeof userSettingsSchema>) { const value = await UserSettings.findOneAndUpdate({ userId: actor.userId }, { $set: input, userId: actor.userId }, { new: true, upsert: true, setDefaultsOnInsert: true }).lean(); await this.cache.delete(cacheKeys.userSettings(actor.userId)); return value; }
  async getOrganization(actor: Actor) { this.requireOrganization(actor); if (!organizationReaders.has(actor.role)) throw new AuthorizationException("Organization settings access denied"); const key = cacheKeys.organizationSettings(actor.organizationId!); const cached = await this.cache.get<unknown>(key); if (cached) return cached; const value = await OrganizationSettings.findOne({ organizationId: actor.organizationId }).lean() ?? this.organizationDefaults(actor.organizationId!); await this.cache.set(key, value, cacheTtlSeconds.settings); return value; }
  async updateOrganization(actor: Actor, input: z.infer<typeof organizationSettingsSchema>) { this.requireOrganization(actor); if (!organizationManagers.has(actor.role)) throw new AuthorizationException("Only authorized organization managers can update settings"); const value = await OrganizationSettings.findOneAndUpdate({ organizationId: actor.organizationId }, { $set: input, organizationId: actor.organizationId }, { new: true, upsert: true, setDefaultsOnInsert: true }).lean(); await this.cache.delete(cacheKeys.organizationSettings(actor.organizationId!)); return value; }
  async getVendor(actor: Actor) { this.requireVendor(actor); if (!vendorManagers.has(actor.role)) throw new AuthorizationException("Vendor settings access denied"); const key = cacheKeys.vendorSettings(actor.vendorId!); const cached = await this.cache.get<unknown>(key); if (cached) return cached; const value = await VendorSettings.findOne({ vendorId: actor.vendorId }).lean() ?? this.vendorDefaults(actor.vendorId!); await this.cache.set(key, value, cacheTtlSeconds.settings); return value; }
  async updateVendor(actor: Actor, input: z.infer<typeof vendorSettingsSchema>) { this.requireVendor(actor); if (!vendorManagers.has(actor.role)) throw new AuthorizationException("Only authorized vendor managers can update settings"); const value = await VendorSettings.findOneAndUpdate({ vendorId: actor.vendorId }, { $set: input, vendorId: actor.vendorId }, { new: true, upsert: true, setDefaultsOnInsert: true }).lean(); await this.cache.delete(cacheKeys.vendorSettings(actor.vendorId!)); return value; }
  private requireOrganization(actor: Actor) { if (!actor.organizationId) throw new AuthorizationException("Organization context required"); }
  private requireVendor(actor: Actor) { if (!actor.vendorId) throw new AuthorizationException("Vendor context required"); }
  private userDefaults(userId: string) { return { userId, language: "en", timezone: "UTC", dateFormat: "YYYY-MM-DD" as const, timeFormat: "24h" as const, accessibility: { reducedMotion: false, highContrast: false, screenReaderAnnouncements: true } }; }
  private organizationDefaults(organizationId: string) { return { organizationId, timezone: "UTC", locale: "en-NG", currency: "NGN", defaultWorkOrderPriority: "medium" as const, defaultServiceRequestPriority: "medium" as const, notificationPolicies: {} }; }
  private vendorDefaults(vendorId: string) { return { vendorId, timezone: "UTC", locale: "en-NG", marketplaceAvailable: true, profileVisible: true, autoApply: false, contractTypes: { pm: true, emergency: true, modernization: false, audits: true } }; }
}
