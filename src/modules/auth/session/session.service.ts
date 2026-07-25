import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "@/shared/utils/jwt.js";
import type { IUser } from "@/modules/users/user.types.js";
import type { SessionMetadata } from "@/shared/types/session.types.js";
import type { RefreshResponse } from "./session.types.js";
import { hashToken } from "@/shared/utils/token-hash.js";
import { calculateRefreshExpiry } from "../auth.utils.js";
import { SessionRepository } from "./session.repository.js";
import type { CreateRefreshTokenDto } from "./session.types.js";
import { UserService } from "@/modules/users/user.service.js";
import { AppError } from "@/shared/errors/AppError.js";
import { AuthLogService } from "../auth-log/auth-log.service.js";
import { AUTH_ACTIONS } from "../auth-log/auth-log.types.js";
import { SecurityAlertService } from "@/modules/security/security.service.js";
import { SecurityAlertType } from "@/modules/security/security.types.js";
import type { SessionResponse } from "./session.types.js";

export class SessionService {
  constructor(
    private readonly repository: SessionRepository,
    private readonly userService: UserService,
    private readonly authLogService: AuthLogService,
    private readonly securityAlertService: SecurityAlertService,
  ) {}

  private validateToken(refreshToken: string) {
    const decoded = verifyRefreshToken(refreshToken);

    if (!decoded || typeof decoded === "string") {
      throw new AppError("Invalid refresh token", 401);
    }

    return decoded;
  }

  async createSession(user: IUser, session: SessionMetadata) {
    const refreshToken = generateRefreshToken({
      userId: user._id.toString(),
      role: user.role,
    });

    const tokenHash = hashToken(refreshToken);

    const familyId = crypto.randomUUID();

    const sessionId = crypto.randomUUID();

    const refreshTokenRecord: CreateRefreshTokenDto = {
      sessionId,

      userId: user._id,

      tokenHash,

      familyId,

      expiresAt: calculateRefreshExpiry(),

      lastUsedAt: new Date(),

      ...session,
    };

    await this.repository.create(refreshTokenRecord);

    return {
      refreshToken,
      sessionId,
    };
  }
  // =================================
  // REFRESH TOKEN
  // =================================

  async refresh(
    refreshToken: string,
    session: SessionMetadata,
  ): Promise<RefreshResponse> {
    const decoded = this.validateToken(refreshToken);

    const oldHash = hashToken(refreshToken);

    const tokenRecord = await this.repository.findByHash(oldHash);

    if (tokenRecord?.revokedAt && tokenRecord?.replacedByTokenHash) {
      await this.repository.revokeFamily(
        tokenRecord?.familyId,
        "reuse_detected",
      );

      throw new AppError("Session compromised. Login again.", 401);
    }

    const reusedToken = await this.repository.detectReuse(oldHash);

    if (reusedToken) {
      await this.repository.revokeFamily(reusedToken.familyId, "token_reuse");

      await this.securityAlertService.createAlert({
        userId: reusedToken.userId,

        type: SecurityAlertType.TOKEN_REUSE,

        sessionMetadata: session,

        metadata: {
          familyId: reusedToken.familyId,
        },
      });

      throw new AppError("Refresh token reuse detected", 401);
    }

    const user = await this.userService.getRequiredUser(decoded.userId);

    if (!user) {
      throw new AppError("User not found", 404);
    }

    const newRefreshToken = generateRefreshToken({
      userId: user._id.toString(),
      role: user.role,
    });

    const newHash = hashToken(newRefreshToken);

    await this.repository.rotateToken(
      oldHash,
      newHash,
      calculateRefreshExpiry(),
    );

    const accessToken = generateAccessToken({
      userId: user._id.toString(),
      role: user.role,

      ...(user.organizationId && {
        organizationId: user.organizationId.toString(),
      }),

      ...(user.vendorId && {
        vendorId: user.vendorId.toString(),
      }),

      ...(user.facilityId && {
        facilityId: user.facilityId.toString(),
      }),
    });

    await this.authLogService.log({
      userId: user._id,

      email: user.email,

      provider: user.provider,

      action: AUTH_ACTIONS.SESSION_REFRESHED,

      outcome: "success",

      sessionMetadata: session,
    });

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  // ==================================
  // GET SESSIONS
  // ==================================
  async getSessions(
    userId: string,
    session: SessionMetadata,
  ): Promise<SessionResponse[]> {
    const user = await this.userService.findById(userId);

    if (!user) {
      throw new AppError("User not found", 404);
    }

    const sessions = await this.repository.findActiveSessions(userId);

    await this.authLogService.log({
      userId: user._id,

      email: user.email,

      provider: user.provider,

      action: AUTH_ACTIONS.SESSION_REFRESHED,

      outcome: "success",

      sessionMetadata: session,
    });

    return sessions.map((s) => ({
      id: s.sessionId,

      browser: s.browser,

      os: s.os,

      deviceType: s.deviceType,

      ipAddress: s.ipAddress,

      country: s.country,

      city: s.city,

      lastUsedAt: s.lastUsedAt,

      expiresAt: s.expiresAt,

      createdAt: s.createdAt,

      current: s.sessionId === session.sessionId,
    }));
  }

  // ==================================
  // REVOKE SESSIONS
  // ==================================
  async revokeSession(
    userId: string,
    sessionId: string,
    sessionMetadata: SessionMetadata,
  ) {
    const session = await this.repository.findById(sessionId);

    if (!session) {
      throw new AppError("Session not found", 404);
    }

    if (session.userId.toString() !== userId) {
      throw new AppError("Forbidden", 403);
    }

    const user = await this.userService.findById(userId);

    if (!user) {
      throw new AppError("User not found", 404);
    }

    await this.repository.revokeSession(
      session._id.toString(),
      "manual_logout",
    );

    await this.authLogService.log({
      userId: user._id,

      email: user.email,

      provider: user.provider,

      action: AUTH_ACTIONS.SESSION_REVOKED,

      outcome: "success",

      sessionMetadata,
    });

    return {
      message: "Session revoked",
    };
  }

  // ==================================
  // LOGOUT CURRENT DEVICE
  // ==================================

  async logout(refreshToken: string, session: SessionMetadata) {
    const decoded = this.validateToken(refreshToken);

    const user = await this.userService.findById(decoded.userId);

    if (!user) {
      throw new AppError("User not found", 404);
    }

    await this.repository.revoke(hashToken(refreshToken), "logout");

    await this.authLogService.log({
      userId: user._id,

      email: user.email,

      provider: user.provider,

      action: AUTH_ACTIONS.LOGOUT,

      outcome: "success",

      sessionMetadata: session,
    });
  }

  // ==================================
  // LOGOUT ALL DEVICES
  // ==================================
  async logoutAll(userId: string, session?: SessionMetadata) {
    const user = await this.userService.findById(userId);

    if (!user) {
      throw new AppError("User not found", 404);
    }

    const sessions = await this.repository.findActiveSessions(userId);

    if (sessions.length === 0) {
      throw new AppError("No active sessions found", 404);
    }

    await this.repository.revokeAllForUser(userId, "logout_all");

    await this.authLogService.log({
      userId: user._id,

      email: user.email,

      provider: user.provider,

      action: AUTH_ACTIONS.LOGOUT_ALL,

      outcome: "success",

      sessionMetadata: session,
    });
  }
}
