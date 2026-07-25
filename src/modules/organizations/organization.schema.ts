import { z } from "zod";

import {
  organizationNameSchema,
  industrySchema,
  organizationDescriptionSchema,
  organizationWebsiteSchema,
  organizationLogoSchema,
} from "@/shared/validators/organization.js";

import { objectIdSchema } from "@/shared/validators/objectId.js";

import { addressSchema } from "@/shared/validators/common.js";

import { phoneSchema } from "@/shared/validators/user.js";

export const updateOrganizationSchema = z.object({
  organizationName: organizationNameSchema.optional(),

  industry: industrySchema.optional(),

  phone: phoneSchema.optional(),

  address: addressSchema.optional(),

  description: organizationDescriptionSchema,

  website: organizationWebsiteSchema,

  logo: organizationLogoSchema,
});

export type UpdateOrganizationDto = z.infer<typeof updateOrganizationSchema>;

export const organizationIdParamsSchema = z.object({
  id: objectIdSchema,
});

export type OrganizationIdParamsDto = z.infer<
  typeof organizationIdParamsSchema
>;

export const listOrganizationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),

  limit: z.coerce.number().int().min(1).max(100).default(20),

  search: z.string().trim().optional(),

  industry: industrySchema.optional(),
});

export type ListOrganizationsQueryDto = z.infer<
  typeof listOrganizationsQuerySchema
>;
