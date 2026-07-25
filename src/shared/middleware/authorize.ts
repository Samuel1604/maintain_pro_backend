import { requestHandler } from "@/shared/utils/request.js";
import type { AuthRequest } from "@/shared/types/request.js";
import { AppError } from "../errors/AppError.js";

export const authorize = (...roles: string[]) =>
  requestHandler<AuthRequest>(async (req, _res, next) => {
    if (!req.user?.role) {
      throw new AppError("Unauthorized", 401);
    }

    if (!roles.includes(req.user.role)) {
      throw new AppError("Forbidden", 403);
    }

    return next();
  });
