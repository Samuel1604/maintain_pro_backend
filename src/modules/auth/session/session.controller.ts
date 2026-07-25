import { SessionService } from "./session.service.js";
import type { AuthRequest } from "@/shared/types/request.js";
import { buildSessionMetadata } from "@/shared/utils/session.js";
import { successResponse } from "@/shared/utils/response.js";
import { requestHandler } from "@/shared/utils/request.js";
import type { RefreshResponse } from "./session.types.js";
import { setAuthCookies, clearAuthCookies } from "@/config/cookie.config.js";

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

    setAuthCookies(res, auth.refreshToken, sessionId);

    return successResponse(
      res,
      {
        accessToken: auth.accessToken,
      },
      "Token refreshed",
    );
  });

  // =================================
  // GET SESSION
  // =================================
  getSession = requestHandler<AuthRequest>(async (req, res) => {
    const currentSessionId = req.cookies.session_id;

    const sessions = await this.sessionService.getSessions(
      req.user.userId,

      currentSessionId,
    );

    return res.status(200).json({
      success: true,
      data: sessions,
      count: sessions.length,
      message: "Sessions fetched successfully",
    });
  });

  // =================================
  // REVOKE SESSION
  // =================================
  revokeSession = requestHandler<AuthRequest<{ id: string }>>(
    async (req, res) => {
      const sessionId = req.cookies.sessionId;
      const session = await buildSessionMetadata(req);
      await this.sessionService.revokeSession(
        req.user.userId,
        sessionId,
        session,
      );

      return successResponse(res, {}, "Session revoked successfully");
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

    return successResponse(res, {}, "Logged out successfully");
  });

  // =================================
  // LOGOUT ALL DEVICES
  // =================================
  logoutAll = requestHandler<AuthRequest>(async (req, res) => {
    const refreshToken = req.cookies.refreshToken;
    const session = await buildSessionMetadata(req);

    if (refreshToken) {
      await this.sessionService.logoutAll(refreshToken, session);
    }

    clearAuthCookies(res);

    return successResponse(res, {}, "Logged out from all devices");
  });
}
