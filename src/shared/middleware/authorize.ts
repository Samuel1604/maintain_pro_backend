import { requestHandler } from "@/shared/utils/request.js";
import type { AuthRequest } from "@/shared/types/request.js";
import {
  AuthenticationException,
  AuthorizationException,
} from "../errors/index.js";

export const authorize = (...roles: string[]) =>
  requestHandler<AuthRequest>(async (req, _res, next) => {
    if (!req.user?.role) {
      throw new AuthenticationException("Unauthorized");
    }

    if (!roles.includes(req.user.role)) {
      throw new AuthorizationException("Forbidden");
    }

    return next();
  });
