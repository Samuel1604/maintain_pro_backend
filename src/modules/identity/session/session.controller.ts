import { SessionService } from "./session.service.js";
import type { AuthRequest } from "@/shared/types/request.js";
import { buildSessionMetadata } from "@/shared/utils/session.js";
import { requestHandler } from "@/shared/utils/request.js";
import type { RefreshResponse } from "./session.types.js";
import { setAuthCookies, clearAuthCookies } from "@/config/cookie.config.js";

import type { RevokeSessionParamsDto } from "./session.schema.js";

export class SessionController {
  constructor(private sessionService: SessionService) {}

  // =================================
  // REFRESH TOKEN
  // =================================
  refresh = requestHandler<AuthRequest>(async (req, res) => {
    const refreshToken = req.cookies.refreshToken;

    const sessionId = req.cookies.sessionId;
    const session = await buildSessionMetadata(req);

    const auth: RefreshResponse = await this.sessionService.refresh(
      refreshToken,
      {
        ...session,
        sessionId,
      },
    );

    // Tokens are set as httpOnly cookies only — never returned in the
    // body, so client-side JS has no direct access to them.
    setAuthCookies(res, auth.accessToken, auth.refreshToken, sessionId);

    return res.ok({}, "Token refreshed");
  });

  // =================================
  // GET SESSION
  // =================================
  getSession = requestHandler<AuthRequest>(async (req, res) => {
    const currentSessionId = req.cookies.sessionId;
    const session = await buildSessionMetadata(req);

    const sessions = await this.sessionService.getSessions(
      req.user.userId,

      {
        ...session,
        sessionId: currentSessionId,
      },
    );

    return res.ok(sessions, "Sessions fetched successfully");
  });

  // =================================
  // REVOKE SESSION
  // =================================
  revokeSession = requestHandler<AuthRequest<RevokeSessionParamsDto>>(
    async (req, res) => {
      const { id } = req.validated.params;
      await this.sessionService.revokeSession(req.user.userId, id);

      return res.ok({}, "Session revoked successfully");
    },
  );

  // =================================
  // LOGOUT
  // =================================
  logout = requestHandler<AuthRequest>(async (req, res) => {
    const refreshToken = req.cookies.refreshToken;
    const session = await buildSessionMetadata(req);

    if (refreshToken) {
      await this.sessionService.logout(refreshToken, session);
    }

    clearAuthCookies(res);

    return res.ok({}, "Logged out successfully");
  });

  // =================================
  // LOGOUT ALL DEVICES
  // =================================
  logoutAll = requestHandler<AuthRequest>(async (req, res) => {
    await this.sessionService.logoutAll(req.user.userId);

    clearAuthCookies(res);

    return res.ok({}, "Logged out from all devices");
  });
}
