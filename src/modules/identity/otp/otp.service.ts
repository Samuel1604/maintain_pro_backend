import { generateOtp, hashOtp } from "@/shared/utils/otp.js";
import { RedisService } from "@/shared/services/redis.service.js";
import type { OtpPurpose } from "./otp.types.js";
export class OtpService {
  private redis = new RedisService();

  /**
   * OTP expires after 10 minutes
   */
  private OTP_TTL = 60 * 10;

  /**
   * Maximum incorrect attempts within window
   */
  private MAX_ATTEMPTS = 5;

  /**
   * Attempt window
   */

  private ATTEMPT_WINDOW = 60 * 10;

  /**
   * Maximum resend attempts within window
   */
  private MAX_RESENDS = 3;

  /**
   * Resend window
   */
  private RESEND_WINDOW = 60 * 10;

  // --------------------------------
  // Redis Key
  // --------------------------------
  private otpKey(purpose: OtpPurpose, userId: string) {
    return `otp:${purpose}:${userId}`;
  }

  // --------------------------------
  // Rate Limit Key
  // --------------------------------

  private attemptKey(purpose: OtpPurpose, userId: string) {
    return `otp-attempts:${purpose}:${userId}`;
  }
  private async resetAttempts(purpose: OtpPurpose, userId: string) {
    await this.redis.delete(this.attemptKey(purpose, userId));
  }
  private resendKey(purpose: OtpPurpose, userId: string) {
    return `otp-resend:${purpose}:${userId}`;
  }

  // -------------------------------
  // Increment Attemptshash
  // -------------------------------
  private async incrementAttempts(purpose: OtpPurpose, userId: string) {
    const key = this.attemptKey(purpose, userId);

    const count = await this.redis.increment(key);

    if (count === 1) {
      await this.redis.expire(key, this.ATTEMPT_WINDOW);
    }

    return count;
  }

  // --------------------------------
  // Create OTP
  // --------------------------------
  async create(userId: string, purpose: OtpPurpose) {
    const code = generateOtp();

    const hash = hashOtp(code);

    const key = this.otpKey(purpose, userId);

    await this.redis.set(key, hash, this.OTP_TTL);

    return code;
  }

  // --------------------------------
  // Verify OTP
  // --------------------------------
  async verify(userId: string, purpose: OtpPurpose, code: string) {
    const key = this.otpKey(purpose, userId);

    const storedHash = await this.redis.get(key);

    if (!storedHash) {
      return false;
    }

    const incomingHash = hashOtp(code);

    // Wrong OTP
    if (storedHash !== incomingHash) {
      const attempts = await this.incrementAttempts(purpose, userId);

      // Too many failures
      if (attempts >= this.MAX_ATTEMPTS) {
        await this.invalidate(userId, purpose);

        await this.resetAttempts(purpose, userId);
      }

      return false;
    }

    // Success
    await this.invalidate(userId, purpose);

    await this.resetAttempts(purpose, userId);

    return true;
  }

  // --------------------------------
  // Delete OTP
  // --------------------------------
  async invalidate(userId: string, purpose: OtpPurpose) {
    const key = this.otpKey(purpose, userId);

    await this.redis.delete(key);
  }

  // --------------------------------
  // Check Remaining Time
  // --------------------------------
  async ttl(userId: string, purpose: OtpPurpose) {
    const key = this.otpKey(purpose, userId);

    return this.redis.ttl(key);
  }

  // --------------------------------
  // Resend Limit
  // --------------------------------
  async canResend(userId: string, purpose: OtpPurpose) {
    const key = this.resendKey(purpose, userId);

    const count = await this.redis.increment(key);

    if (count === 1) {
      await this.redis.expire(key, this.RESEND_WINDOW);
    }

    return count <= this.MAX_RESENDS;
  }
}
