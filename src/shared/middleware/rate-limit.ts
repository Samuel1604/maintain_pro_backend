import rateLimit, { type Store } from "express-rate-limit";
import { RedisService } from "@/shared/services/redis.service.js";

/**
 * Shared rate-limit store. The default express-rate-limit store is process
 * local, which makes limits ineffective when the API is scaled horizontally.
 */
class RedisRateLimitStore implements Store {
  private readonly redis = new RedisService();
  private windowMs = 60_000;

  init(options: { windowMs?: number }) {
    this.windowMs = options.windowMs ?? this.windowMs;
  }

  async increment(key: string) {
    const count = await this.redis.increment(`rate-limit:${key}`);
    if (count === 1) await this.redis.expire(`rate-limit:${key}`, Math.ceil(this.windowMs / 1000));
    const ttl = await this.redis.ttl(`rate-limit:${key}`);
    return { totalHits: count, resetTime: new Date(Date.now() + Math.max(0, ttl) * 1000) };
  }

  async get(key: string) {
    const value = await this.redis.get(`rate-limit:${key}`);
    if (value === null) return undefined;
    const ttl = await this.redis.ttl(`rate-limit:${key}`);
    return { totalHits: Number(value), resetTime: new Date(Date.now() + Math.max(0, ttl) * 1000) };
  }

  async decrement(key: string) {
    // Rate-limit rollback is not used by the current middleware, so avoid
    // introducing a non-atomic read-modify-write operation here.
    void key;
  }

  async resetKey(key: string) {
    await this.redis.delete(`rate-limit:${key}`);
  }
}

const store = (windowMs: number): Store => {
  const rateLimitStore = new RedisRateLimitStore();
  rateLimitStore.init({ windowMs });
  return rateLimitStore;
};

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  store: store(15 * 60 * 1000),
  message: "Too many login attempts. Please check your credentials and try again later."
});

export const otpRateLimit =
  rateLimit({
    windowMs:
      10 * 60 * 1000,

    max: 3,
    store: store(10 * 60 * 1000),

    message:
      "Too many OTP requests. Please try again later.",
  });

/**
 * OTP verification (as opposed to request/resend) needs a slightly
 * looser per-IP budget than resend/forgot-password — legitimate users
 * mistype a 6-digit code more than once. This is defense-in-depth on
 * top of OtpService's own redis-backed 5-attempt lock (which is keyed
 * per-user/purpose, not per-IP, and invalidates the OTP outright on
 * exhaustion).
 */
export const otpVerifyLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 8,
  store: store(10 * 60 * 1000),
  message: "Too many verification attempts. Please try again later.",
});

/**
 * Refresh is called far more often than login by legitimate clients
 * (silent token renewal), so this budget is generous — it exists to
 * bound abuse/credential-stuffing against the endpoint, not to police
 * normal usage.
 */
export const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  store: store(15 * 60 * 1000),
  message: "Too many refresh attempts. Please try again later.",
});

/**
 * Registration and invitation-acceptance are unauthenticated
 * account-creation endpoints with no other rate limiting in front of
 * them — left unbounded they're an easy target for mass fake-account
 * creation or invitation-token brute-forcing.
 */
export const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  store: store(60 * 60 * 1000),
  message: "Too many registration attempts. Please try again later.",
});

/**
 * Authenticated credential and identity mutations need their own budget.
 * Keeping this separate from OTP request limits prevents a user who is
 * legitimately requesting a code from exhausting the protection around a
 * password or email change.
 */
export const securityMutationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  store: store(15 * 60 * 1000),
  message: "Too many security changes. Please try again later.",
});
