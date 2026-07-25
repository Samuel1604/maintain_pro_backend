import { z } from "zod";
import {
  firstNameSchema,
  lastNameSchema,
  phoneSchema,
  avatarSchema,
  bioSchema,
} from "@/shared/validators/user.js";
import { ROLES } from "@/shared/constants/roles.js";
import { objectIdSchema } from "@/shared/validators/objectId.js";

export const updateProfileSchema = z.object({
  firstName: firstNameSchema.optional(),

  lastName: lastNameSchema.optional(),

  phone: phoneSchema.optional(),

  avatar: avatarSchema,

  bio: bioSchema,
});

export type UpdateProfileDto = z.infer<typeof updateProfileSchema>;

export const updateUserStatusSchema = z.object({
  status: z.enum(["active", "inactive", "suspended", "pending_verification"]),
});

export type UpdateUserStatusDto = z.infer<typeof updateUserStatusSchema>;

export const updateUserRoleSchema = z.object({
  role: z.enum(Object.values(ROLES)),
});

export type UpdateUserRoleDto = z.infer<typeof updateUserRoleSchema>;

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),

  limit: z.coerce.number().int().min(1).max(100).default(20),

  search: z.string().trim().optional(),

  role: z.enum(Object.values(ROLES)).optional(),

  status: z
    .enum(["active", "inactive", "suspended", "pending_verification"])
    .optional(),
});

export type ListUsersQueryDto = z.infer<typeof listUsersQuerySchema>;

export const userIdParamsSchema = z.object({
  id: objectIdSchema,
});

export type UserIdParamsDto = z.infer<typeof userIdParamsSchema>;
