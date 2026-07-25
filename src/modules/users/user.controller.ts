import { requestHandler } from "@/shared/utils/request.js";
import type { AuthRequest } from "@/shared/types/request.js";
import { userService } from "@/container/index.js";

export const getMe = requestHandler<AuthRequest>(async (req, res) => {
  const user = await userService.getMe(req.user);

  return res.status(200).json({
    success: true,
    data: user,
  });
});

export const listAccountUsers = requestHandler<AuthRequest>(
  async (req, res) => {
    const users = await userService.listMyAccountUsers(req.user);

    return res.status(200).json({
      success: true,
      data: users,
    });
  },
);
