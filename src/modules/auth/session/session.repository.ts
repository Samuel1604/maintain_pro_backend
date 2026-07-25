import { Session } from "./session.model.js";
import type { IRefreshToken } from "./session.model.js";

export class SessionRepository {
  create(session: Partial<IRefreshToken>) {
    return Session.create(session);
  }

  findById(sessionId: string) {
    return Session.findById(sessionId);
  }

  async findBySessionId(sessionId: string) {
    return Session.findOne({
      sessionId,
    });
  }

  findByHash(tokenHash: string) {
    return Session.findOne({
      tokenHash,
      revokedAt: null,
    });
  }

  async findActiveSessions(userId: string) {
    return Session.find({
      userId,

      revokedAt: null,

      expiresAt: {
        $gt: new Date(),
      },
    })
      .sort({
        lastUsedAt: -1,
      })
      .lean();
  }

  async findActiveByHash(tokenHash: string) {
    return Session.findOne({
      tokenHash,
      revokedAt: null,
    });
  }

  revoke(tokenHash: string, reason?: string) {
    return Session.findOneAndUpdate(
      { tokenHash },
      {
        revokedAt: new Date(),
        ...(reason && { revokedReason: reason }),
      },
    );
  }

  async revokeSession(sessionId: string, reason: string) {
    return Session.findByIdAndUpdate(
      sessionId,
      {
        revokedAt: new Date(),
        revokeReason: reason,
      },
      {
        new: true,
      },
    );
  }

  async revokeSessionBySessionId(sessionId: string) {
    return Session.updateMany(
      {
        sessionId,
      },

      {
        revokedAt: new Date(),

        revokeReason: "manual_logout",
      },
    );
  }

  async revokeFamily(familyId: string, reason: string) {
    return Session.updateMany(
      {
        familyId,
        revokedAt: null,
      },
      {
        revokedAt: new Date(),
        revokeReason: reason,
      },
    );
  }

  revokeAllForUser(userId: string, reason?: string) {
    return Session.updateMany(
      {
        userId,
        revokedAt: null,
      },
      {
        revokedAt: new Date(),
        ...(reason && { revokedReason: reason }),
      },
    );
  }

  async findByHashIncludingRevoked(tokenHash: string) {
    return Session.findOne({
      tokenHash,
    });
  }

  async detectReuse(tokenHash: string) {
    const token = await this.findByHashIncludingRevoked(tokenHash);

    if (token && token.revokedAt && token.revokeReason === "rotation") {
      return token;
    }

    return null;
  }

  async rotateToken(
    oldTokenHash: string,
    newTokenHash: string,
    expiresAt: Date,
  ) {
    const token = await Session.findOneAndUpdate(
      {
        tokenHash: oldTokenHash,
        revokedAt: null,
      },
      {
        revokedAt: new Date(),
        revokeReason: "rotation",

        replacedByTokenHash: newTokenHash,
      },
      {
        new: true,
      },
    );

    if (!token) {
      return null;
    }

    return Session.create({
      userId: token.userId,
      tokenHash: newTokenHash,
      familyId: token.familyId,
      parentTokenHash: token.tokenHash,
      expiresAt,
      ipAddress: token.ipAddress,
      userAgent: token.userAgent,
      ...(token.browser && {
        browser: token.browser,
      }),
      ...(token.browserVersion && {
        browserVersion: token.browserVersion,
      }),
      ...(token.os && {
        os: token.os,
      }),
      ...(token.osVersion && {
        osVersion: token.osVersion,
      }),
      ...(token.deviceType && {
        deviceType: token.deviceType,
      }),
      ...(token.country && {
        country: token.country,
      }),

      ...(token.city && {
        city: token.city,
      }),

      ...(token.timezone && {
        timezone: token.timezone,
      }),
      lastUsedAt: new Date(),
    });
  }
}
