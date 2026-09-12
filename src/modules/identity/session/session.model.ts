import { Schema, model, Types } from "mongoose";

export interface IRefreshToken extends Document {
  userId: Types.ObjectId;
  sessionId: string;

  tokenHash: string;

  /**
   * Session Family
   */
  familyId: string;

  parentTokenHash?: string;

  replacedByTokenHash?: string;

  /**
   * Network
   */
  ipAddress: string;

  /**
   * Device
   */
  userAgent: string;

  browser?: string;
  browserVersion?: string;

  os?: string;
  osVersion?: string;

  deviceType?: string;

  /**
   * Geo
   */
  country?: string;
  city?: string;
  timezone?: string;

  /**
   * Activity
   */
  lastUsedAt: Date;

  expiresAt: Date;

  revokedAt?: Date;

  revokeReason?:
    | "logout"
    | "logout_all"
    | "rotation"
    | "password_change"
    | "password_reset"
    | "token_reuse"
    | "security";

  createdAt: Date;
  updatedAt: Date;
}

const refreshTokenSchema = new Schema<IRefreshToken>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    sessionId: {
      type: String,
      required: true,
    },

    tokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    /**
     * Session Family
     */
    familyId: {
      type: String,
      required: true,
      index: true,
    },

    parentTokenHash: {
      type: String,
      index: true,
    },

    replacedByTokenHash: {
      type: String,
      index: true,
    },

    /**
     * Device
     */
    ipAddress: String,

    userAgent: String,

    browser: String,
    browserVersion: String,

    os: String,
    osVersion: String,

    deviceType: String,

    /**
     * Geo
     */
    country: String,
    city: String,
    timezone: String,

    /**
     * Activity
     */
    lastUsedAt: Date,

    expiresAt: {
      type: Date,
      required: true,
      // Keep expired/revoked session history for 90 days for incident
      // investigation, then let MongoDB's TTL monitor remove it.
      index: { expires: 90 * 24 * 60 * 60 },
    },

    revokedAt: Date,

    revokeReason: {
      type: String,
      enum: [
        "logout",
        "logout_all",
        "rotation",
        "password_change",
        "password_reset",
        "token_reuse",
        "security",
      ],
    },
  },
  {
    timestamps: true,
  },
);

refreshTokenSchema.index({
  userId: 1,
  revokedAt: 1,
});

// sessionId is the stable, client-facing identity of a logical session — it
// is carried over across every token rotation within that session (same
// value in the client's sessionId cookie, in "current session" comparisons,
// and in event payloads). A document-wide unique index would therefore
// collide with a session's own prior (now-revoked) rows once a rotation
// reuses the value. Uniqueness only needs to hold among currently-active
// rows — two live sessions must never share a sessionId, but a session's
// revoked history sharing it with its active replacement is expected.
refreshTokenSchema.index(
  { sessionId: 1 },
  { unique: true, partialFilterExpression: { revokedAt: null } },
);

export const Session = model<IRefreshToken>("RefreshToken", refreshTokenSchema);
