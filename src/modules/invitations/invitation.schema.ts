import { z } from "zod";

import { ROLES } from "@/shared/constants/roles.js";
import {
  objectIdSchema,
  emailSchema,
  pageSchema,
  limitSchema,
  searchSchema,
  roleSchema,
  invitationStatusSchema,
  invitationTokenSchema,
  firstNameSchema,
  lastNameSchema,
  passwordSchema,
} from "@/shared/validators/index.js";

const createInvitationBodySchema = z.object({
  email: emailSchema,
  role: z.enum(Object.values(ROLES) as [string, ...string[]]),
  invitedBy: objectIdSchema.optional(),
  invitationType: z.enum(["organization", "vendor", "facility"]).optional(),
  organizationId: objectIdSchema.optional(),
  facilityId: objectIdSchema.optional(),
  vendorId: objectIdSchema.optional(),
  resentFromInvitationId: objectIdSchema.optional(),
  firstName: firstNameSchema.optional(),
  lastName: lastNameSchema.optional(),
});

export const createInvitationSchema = z.object({
  body: createInvitationBodySchema,
});

export type CreateInvitationDto = z.infer<typeof createInvitationBodySchema>;

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

const acceptInvitationBodySchema = z.object({
  token: invitationTokenSchema,
  firstName: firstNameSchema,
  lastName: lastNameSchema,
  password: passwordSchema,
});

export const acceptInvitationSchema = z.object({
  body: acceptInvitationBodySchema,
});

export type AcceptInvitationDto = z.infer<typeof acceptInvitationBodySchema>;

// ─── Temp Invitation (system-generated password) ─────────────────────────────

const sendTempInviteBodySchema = z.object({
  email: emailSchema,
  firstName: firstNameSchema,
  lastName: lastNameSchema,
  role: z.enum(Object.values(ROLES) as [string, ...string[]]),
});

export const sendTempInviteSchema = z.object({
  body: sendTempInviteBodySchema,
});

export type CreateTempInvitationDto = z.infer<typeof sendTempInviteBodySchema>;
