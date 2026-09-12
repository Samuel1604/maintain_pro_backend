import { requestHandler } from "@/shared/utils/request.js";
import type { AuthRequest } from "@/shared/types/request.js";
import { userSettingsSchema, organizationSettingsSchema, vendorSettingsSchema } from "./settings.schema.js";
import { SettingsService } from "./settings.service.js";

const service = new SettingsService();
export const getUserSettings = requestHandler<AuthRequest>(async (req, res) => res.ok(await service.getUser(req.user), "User settings retrieved"));
export const updateUserSettings = requestHandler<AuthRequest>(async (req, res) => res.ok(await service.updateUser(req.user, userSettingsSchema.parse(req.body)), "User settings updated"));
export const getOrganizationSettings = requestHandler<AuthRequest>(async (req, res) => res.ok(await service.getOrganization(req.user), "Organization settings retrieved"));
export const updateOrganizationSettings = requestHandler<AuthRequest>(async (req, res) => res.ok(await service.updateOrganization(req.user, organizationSettingsSchema.parse(req.body)), "Organization settings updated"));
export const getVendorSettings = requestHandler<AuthRequest>(async (req, res) => res.ok(await service.getVendor(req.user), "Vendor settings retrieved"));
export const updateVendorSettings = requestHandler<AuthRequest>(async (req, res) => res.ok(await service.updateVendor(req.user, vendorSettingsSchema.parse(req.body)), "Vendor settings updated"));
