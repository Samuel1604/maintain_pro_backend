import { AuthorizationException, NotFoundException } from "@/shared/errors/index.js";
import { ROLES } from "@/shared/constants/roles.js";
import { NotificationPreference } from "./notification-preference.model.js";
import { EscalationRule } from "./escalation-rule.model.js";
import type { z } from "zod";
import type { preferenceSchema, escalationRuleSchema } from "./notification-preference.schema.js";
import { RedisCache } from "@/infrastructure/cache/redis.cache.js";
import { cacheKeys, cacheTtlSeconds } from "@/infrastructure/cache/cache-keys.js";
type Actor = { userId: string; role: string; organizationId?: string };
const managers = [ROLES.ADMIN, ROLES.FACILITY_MANAGER];
export class NotificationPreferenceService {
  private cache = new RedisCache();
  async getPreferences(actor: Actor) { const key = cacheKeys.notificationPreferences(actor.userId); const cached = await this.cache.get<unknown>(key); if (cached) return cached; const existing = await NotificationPreference.findOne({ userId: actor.userId }).lean(); const value = existing ?? { userId: actor.userId, channels: {}, quietHours: { enabled: false, start: "09:00", end: "17:00" } }; await this.cache.set(key, value, cacheTtlSeconds.notificationPreferences); return value; }
  async updatePreferences(input: z.infer<typeof preferenceSchema>, actor: Actor) { const value = await NotificationPreference.findOneAndUpdate({ userId: actor.userId }, { $set: input }, { new: true, upsert: true, setDefaultsOnInsert: true }).lean(); await this.cache.delete(cacheKeys.notificationPreferences(actor.userId)); return value; }
  private organization(actor: Actor) { if (!actor.organizationId) throw new AuthorizationException("Organization context required"); return actor.organizationId; }
  private manage(actor: Actor) { if (!managers.includes(actor.role as typeof ROLES.ADMIN | typeof ROLES.FACILITY_MANAGER)) throw new AuthorizationException("Only organization administrators can manage escalation rules"); }
  async listEscalationRules(actor: Actor) { return EscalationRule.find({ organizationId: this.organization(actor) }).sort({ level: 1, createdAt: 1 }).limit(100).lean(); }
  async createEscalationRule(input: z.infer<typeof escalationRuleSchema>, actor: Actor) { this.manage(actor); return EscalationRule.create({ ...input, organizationId: this.organization(actor), createdBy: actor.userId }); }
  async updateEscalationRule(id: string, input: Partial<z.infer<typeof escalationRuleSchema>>, actor: Actor) { this.manage(actor); const updated = await EscalationRule.findOneAndUpdate({ _id: id, organizationId: this.organization(actor) }, input, { new: true }); if (!updated) throw new NotFoundException("Escalation rule not found"); return updated; }
  async deleteEscalationRule(id: string, actor: Actor) { this.manage(actor); const deleted = await EscalationRule.findOneAndDelete({ _id: id, organizationId: this.organization(actor) }); if (!deleted) throw new NotFoundException("Escalation rule not found"); }
}
