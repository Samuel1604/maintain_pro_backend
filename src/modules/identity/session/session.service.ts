import { Organization } from "@/modules/organizations/organization.model.js";
import { Vendor } from "@/modules/vendors/vendor.model.js";
import { uniqueOrganizationSlug, uniqueVendorSlug } from "@/shared/utils/slug.js";

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
import {
  AuthenticationException,
  NotFoundException,
  AuthorizationException,
} from "@/shared/errors/index.js";
import { SecurityAlertType } from "@/modules/security/security.types.js";
import type { SessionResponse } from "./session.types.js";
import {
  toAuthenticatedUser,
  toUserProfile,
} from "@/modules/users/mappers/user.mapper.js";
import type { AuthResponse } from "../auth.types.js";
import { UserReader } from "@/modules/users/user.reader.js";
import type { EventBus } from "@/infrastructure/events/bus/event-bus.interface.js";
import {
  SessionCreatedEvent,
  SessionRevokedEvent,
  UserLoggedOutEvent,
  SecurityAlertRaisedEvent,
} from "@/modules/identity/events/index.js";

export class SessionService {
  constructor(
    private readonly repository: SessionRepository,
    private readonly userReader: UserReader,
    private readonly eventBus: EventBus,
  ) {}

  private validateToken(refreshToken: string) {
    if (!refreshToken) {
      throw new AuthenticationException(
        "Session expired or revoked. Please log in again.",
      );
    }
    const decoded = verifyRefreshToken(refreshToken);

    if (!decoded || typeof decoded === "string") {
      throw new AuthenticationException("Invalid refresh token");
    }

    return decoded;
  }

  async createSession(user: IUser, session: SessionMetadata) {
    const authenticatedUser = toAuthenticatedUser(user);

    const refreshToken = generateRefreshToken({
      userId: authenticatedUser.id,
      role: authenticatedUser.role,
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

  // ================================
  // AUTH RESPONSE
  // ================================
  async createAuthenticatedSession(
    user: IUser,
    session: SessionMetadata,
  ): Promise<AuthResponse> {
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

    const { refreshToken, sessionId } = await this.createSession(user, session);

    void this.eventBus.publish(
      new SessionCreatedEvent({
        userId: user._id.toString(),
        sessionId,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
      }),
    ).catch(() => undefined);

    let organizationSlug: string | undefined;
    let vendorSlug: string | undefined;

    if (user.organizationId) {
      const org = await Organization.findById(user.organizationId);
      if (org) {
        if (!org.slug) {
          const generatedSlug = await uniqueOrganizationSlug(org.name);
          org.slug = generatedSlug;
          await org.save();
          organizationSlug = generatedSlug;
        } else {
          organizationSlug = org.slug;
        }
      }
    }
    if (user.vendorId) {
      const vend = await Vendor.findById(user.vendorId);
      if (vend) {
        if (!vend.slug) {
          const generatedSlug = await uniqueVendorSlug(vend.name);
          vend.slug = generatedSlug;
          await vend.save();
          vendorSlug = generatedSlug;
        } else {
          vendorSlug = vend.slug;
        }
      }
    }

    const userProfile = toUserProfile(user, organizationSlug, vendorSlug);

    return {
      refreshToken,
      accessToken,
      user: userProfile,
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

    // findByHash only ever returns a record when revokedAt is null, so
    // a hit here means this is a currently-active, un-revoked session.
    const tokenRecord = await this.repository.findByHash(oldHash);

    if (!tokenRecord) {
      /**
       * No active session for this token. This covers several cases
       * that all need to be treated as "refresh denied", not just
       * rotation-reuse:
       *   - the token was already rotated (normal reuse-after-rotation,
       *     which IS a compromise signal — a legit client would be
       *     using the newest token in the chain)
       *   - the token was revoked by logout / revoke-session / logout-all
       *   - the token never existed / expired and was purged
       *
       * Previously only the first case was rejected; a token revoked by
       * logout (revokeReason !== "rotation") fell through and silently
       * minted a fresh access+refresh pair anyway, which meant "log
       * out" and "revoke this device" didn't actually stop a leaked
       * refresh token from being used. Any non-active hit must fail
       * refresh; we only escalate to a family-wide revoke + security
       * alert for the rotation-reuse case specifically, since that one
       * is a strong signal of token theft rather than a normal logout.
       */
      const revokedRecord =
        await this.repository.findByHashIncludingRevoked(oldHash);

      if (revokedRecord?.revokeReason === "rotation") {
        await this.repository.revokeFamily(
          revokedRecord.familyId,
          "token_reuse",
        );

        await this.eventBus.publish(
          new SecurityAlertRaisedEvent({
            userId: revokedRecord.userId.toString(),
            type: SecurityAlertType.TOKEN_REUSE,
            sessionMetadata: session,
            metadata: {
              familyId: revokedRecord.familyId,
            },
          }),
        );

        throw new AuthenticationException("Session compromised. Login again.");
      }

      throw new AuthenticationException(
        "Session expired or revoked. Please log in again.",
      );
    }

    const user = await this.userReader.findById(decoded.userId);

    if (!user) {
      throw new NotFoundException("User not found");
    }

    const newRefreshToken = generateRefreshToken({
      userId: user.id,
      role: user.role,
    });

    const newHash = hashToken(newRefreshToken);

    const rotated = await this.repository.rotateToken(
      oldHash,
      newHash,
      calculateRefreshExpiry(),
    );

    if (!rotated) {
      // Someone else (a concurrent refresh using the same token) won
      // the race and already rotated it out from under us. Treat this
      // request as denied rather than handing back tokens with no
      // backing session record.
      throw new AuthenticationException(
        "Session expired or revoked. Please log in again.",
      );
    }

    const accessToken = generateAccessToken({
      userId: user.id,
      role: user.role,

      ...(user.organizationId && {
        organizationId: user.organizationId,
      }),

      ...(user.vendorId && {
        vendorId: user.vendorId,
      }),

      ...(user.facilityId && {
        facilityId: user.facilityId,
      }),
    });

    await this.eventBus.publish(
      new SessionCreatedEvent({
        userId: user.id,
        sessionId: tokenRecord?.sessionId ?? "",
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
      }),
    );

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
    const user = await this.userReader.findById(userId);

    if (!user) {
      throw new NotFoundException("User not found");
    }

    const sessions = await this.repository.findActiveSessions(userId);

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
  async revokeSession(userId: string, sessionId: string) {
    const session = await this.repository.findBySessionId(sessionId);

    if (!session) {
      throw new NotFoundException("Session not found");
    }

    if (session.userId.toString() !== userId) {
      throw new AuthorizationException("Forbidden");
    }

    const user = await this.userReader.findById(userId);

    if (!user) {
      throw new NotFoundException("User not found");
    }

    await this.repository.revokeSession(
      session._id.toString(),
      "manual_logout",
    );

    await this.eventBus.publish(
      new SessionRevokedEvent({
        userId: user.id,
        sessionId,
        reason: "manual_logout",
      }),
    );

    return {
      message: "Session revoked",
    };
  }

  // ==================================
  // LOGOUT CURRENT DEVICE
  // ==================================

  async logout(refreshToken: string, session: SessionMetadata) {
    const decoded = this.validateToken(refreshToken);

    const user = await this.userReader.findById(decoded.userId);

    if (!user) {
      throw new NotFoundException("User not found");
    }

    await this.repository.revoke(hashToken(refreshToken), "logout");

    await this.eventBus.publish(
      new UserLoggedOutEvent({
        userId: user.id,
        sessionId: session.sessionId ?? "",
        reason: "logout",
      }),
    );
  }

  // ==================================
  // LOGOUT ALL DEVICES
  // ==================================
  async logoutAll(userId: string) {
    const user = await this.userReader.findById(userId);

    if (!user) {
      throw new NotFoundException("User not found");
    }

    const sessions = await this.repository.findActiveSessions(userId);

    if (sessions.length === 0) {
      throw new NotFoundException("No active sessions found");
    }

    await this.repository.revokeAllForUser(userId, "logout_all");

    await Promise.all(
      sessions.map((activeSession) =>
        this.eventBus.publish(
          new SessionRevokedEvent({
            userId: user.id,
            sessionId: activeSession.sessionId,
            reason: "logout_all",
          }),
        ),
      ),
    );
  }
}
