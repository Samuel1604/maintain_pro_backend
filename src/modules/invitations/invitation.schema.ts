import { z } from "zod";

import { ROLES } from "@/shared/constants/roles.js";
import { objectIdSchema } from "@/shared/validators/objectId.js";
import { emailSchema } from "@/shared/validators/auth.js";
import {pageSchema, limitSchema, searchSchema, roleSchema} from "@/shared/validators/common.js"

import { invitationStatusSchema } from "@/shared/validators/invitation.js";

export const createInvitationSchema = z.object({
  email: emailSchema,

  role: z.enum(Object.values(ROLES)),
  invitedBy: objectIdSchema,
  invitationType: z.enum(["organization", "vendor", "facility"]),
  organizationId: objectIdSchema.optional(),
  facilityId: objectIdSchema.optional(),
  vendorId: objectIdSchema.optional(),
  resentFromInvitationId: objectIdSchema.optional(),
});

export type CreateInvitationDto =
  z.infer<typeof createInvitationSchema>;

export const listInvitationsSchema = z.object({
  page: pageSchema,

  limit: limitSchema,

  search: searchSchema,

  role: roleSchema.optional(),

  status: invitationStatusSchema.optional(),

  facilityId: objectIdSchema.optional(),
});

export type ListInvitationsDto = z.infer<typeof listInvitationsSchema>;


export const invitationIdParamsSchema = z.object({
  id: objectIdSchema,
});

export type InvitationIdParamsDto = z.infer<typeof invitationIdParamsSchema>;


export const validateInvitationSchema = z.object({
  token: z.string().trim().min(1),
});

export type ValidateInvitationDto = z.infer<typeof validateInvitationSchema>;