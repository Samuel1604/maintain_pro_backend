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
      unique: true,
      index: true,
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
      index: true,
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

export const Session = model<IRefreshToken>("RefreshToken", refreshTokenSchema);
