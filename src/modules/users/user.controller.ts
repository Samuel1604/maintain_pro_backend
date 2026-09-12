import { requestHandler } from "@/shared/utils/request.js";
import type { AuthRequest } from "@/shared/types/request.js";
import { userReader } from "@/container/index.js";
import { userService } from "@/container/index.js";
import { z } from "zod";
import { avatarSchema, firstNameSchema, lastNameSchema, phoneSchema } from "@/shared/validators/index.js";

const updateProfileSchema = z.object({ firstName: firstNameSchema.optional(), lastName: lastNameSchema.optional(), phone: phoneSchema.optional(), avatar: avatarSchema }).strict();

export const getMe = requestHandler<AuthRequest>(async (req, res) => {
  const result = await userReader.getMe(req.user);

  return res.ok(result, "Profile retrieved successfully");
});

export const listAccountUsers = requestHandler<AuthRequest>(
  async (req, res) => {
    const result = await userReader.listUsers(req.user);

    return res.ok(result, "Account users retrieved successfully");
  },
);

export const updateMe = requestHandler<AuthRequest>(async (req, res) => {
  const updated = await userService.updateProfile(req.user.userId, updateProfileSchema.parse(req.body));
  return res.ok(updated, "Profile updated successfully");
});
