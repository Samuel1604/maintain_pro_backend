import { z } from "zod";

import {
  organizationNameSchema,
  industrySchema,
  organizationWebsiteSchema,
  organizationLogoSchema,
} from "@/shared/validators/organization.js";

import { emailSchema } from "@/shared/validators/auth.js";
import { phoneSchema } from "@/shared/validators/user.js";
import { addressSchema } from "@/shared/validators/common.js";

/**
 * Fields an organization admin can update about their own organization's
 * profile. Deliberately excludes:
 *  - status (lifecycle transitions are a separate, internal capability —
 *    not a self-service profile edit)
 *  - plan/subscription (owned by Billing)
 */
const updateOrganizationBodySchema = z
  .object({
    name: organizationNameSchema,
    industry: industrySchema,
    email: emailSchema,
    phone: phoneSchema,
    address: addressSchema,
    website: organizationWebsiteSchema,
    logo: organizationLogoSchema,
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export const updateOrganizationSchema = z.object({
  body: updateOrganizationBodySchema,
});

export type UpdateOrganizationDto = z.infer<typeof updateOrganizationBodySchema>;
