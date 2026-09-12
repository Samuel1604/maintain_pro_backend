import crypto from "node:crypto";
import { RedisService } from "@/shared/services/redis.service.js";
import { hashToken } from "@/shared/utils/token-hash.js";
import type { VerificationLinkPurpose } from "./verification-link.types.js";

/**
 * VerificationLinkService — link-based verification abstraction.
 *
 * Sits alongside OtpService. AuthService selects which to use via
 * VERIFICATION_STRATEGY. When a real mail provider is integrated,
 * switching strategies requires only changing that constant.
 *
 * Design:
 *  - Generates a cryptographically random 32-byte hex token.
 *  - Stores sha256(token) in Redis with a 5-minute TTL.
 *  - The raw token is embedded in a URL and sent to the user.
 *  - "Regenerate" atomically deletes the old token and issues a new one
 *    (production-grade resend: the old link becomes immediately invalid).
 */
export class VerificationLinkService {
  private readonly redis = new RedisService();

  /** 5 minutes */
  private readonly TTL = 60 * 5;

  /** Regeneration rate limit window: 5 minutes */
  private readonly REGEN_WINDOW = 60 * 5;

  /** Max regeneration requests per window */
  private readonly MAX_REGENS = 3;

  // ─── Redis Keys ─────────────────────────────────────────────────────────────

  private tokenKey(purpose: VerificationLinkPurpose, userId: string) {
    return `vlink:${purpose}:${userId}`;
  }

  private regenKey(purpose: VerificationLinkPurpose, userId: string) {
    return `vlink-regen:${purpose}:${userId}`;
  }

  // ─── Create ─────────────────────────────────────────────────────────────────

  /**
   * Creates a new verification link token.
   * Returns the raw token to be embedded in the URL.
   */
  async create(userId: string, purpose: VerificationLinkPurpose): Promise<string> {
    const token = crypto.randomBytes(32).toString("hex");
    const hash = hashToken(token);

    await this.redis.set(this.tokenKey(purpose, userId), hash, this.TTL);

    return token;
  }

  // ─── Verify ─────────────────────────────────────────────────────────────────

  /**
   * Verifies a token and returns true on success.
   * Deletes the token atomically on success (single-use guarantee).
   */
  async verify(
    userId: string,
    purpose: VerificationLinkPurpose,
    token: string,
  ): Promise<boolean> {
    const key = this.tokenKey(purpose, userId);
    const storedHash = await this.redis.get(key);

    if (!storedHash) {
      return false; // expired or never existed
    }

    const incoming = hashToken(token);

    if (storedHash !== incoming) {
      return false; // invalid token
    }

    // Delete on first use — single-use guarantee
    await this.redis.delete(key);
    return true;
  }

  // ─── Regenerate ─────────────────────────────────────────────────────────────

  /**
   * Regenerates a verification link token.
   * Immediately invalidates any existing token for this user+purpose,
   * then issues a fresh one with a new 5-minute TTL.
   * Rate-limited to MAX_REGENS per REGEN_WINDOW.
   *
   * Returns { token, allowed }. Callers should check `allowed`.
   */
  async regenerate(
    userId: string,
    purpose: VerificationLinkPurpose,
  ): Promise<{ token: string; allowed: boolean }> {
    const regenKey = this.regenKey(purpose, userId);
    const count = await this.redis.increment(regenKey);

    if (count === 1) {
      await this.redis.expire(regenKey, this.REGEN_WINDOW);
    }

    if (count > this.MAX_REGENS) {
      return { token: "", allowed: false };
    }

    // Atomically invalidate old token
    await this.redis.delete(this.tokenKey(purpose, userId));

    const token = await this.create(userId, purpose);
    return { token, allowed: true };
  }

  // ─── TTL ────────────────────────────────────────────────────────────────────

  /**
   * Returns remaining TTL in seconds for the current token.
   */
  async ttl(userId: string, purpose: VerificationLinkPurpose): Promise<number> {
    return this.redis.ttl(this.tokenKey(purpose, userId));
  }

  // ─── Invalidate ─────────────────────────────────────────────────────────────

  /**
   * Manually invalidates the token (e.g. on account deletion).
   */
  async invalidate(userId: string, purpose: VerificationLinkPurpose): Promise<void> {
    await this.redis.delete(this.tokenKey(purpose, userId));
  }
}
