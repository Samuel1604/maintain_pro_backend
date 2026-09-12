import { requestHandler } from "@/shared/utils/request.js";
import type { AuthRequest } from "@/shared/types/request.js";
import {
  AuthenticationException,
  AuthorizationException,
} from "../errors/index.js";

/**
 * Gate for restricted business operations (creating organizations/facilities,
 * vendors, work orders, invitations, billing operations, etc). This is
 * layered on top of `authMiddleware` — it assumes the caller is already
 * authenticated and only adds the email-verification requirement.
 *
 * Emits `code: "EMAIL_NOT_VERIFIED"` so the frontend's centralized error
 * handler can recognize it and show a verification prompt instead of
 * treating it like a generic 403.
 */
export const requireVerifiedEmail = requestHandler<AuthRequest>(
  async (req, _res, next) => {
    if (!req.user?.userId) {
      throw new AuthenticationException("Authentication required");
    }

    if (!req.user.isVerified) {
      throw new AuthorizationException(
        "Please verify your email address before performing this action.",
        { code: "EMAIL_NOT_VERIFIED" },
      );
    }

    return next();
  },
);
