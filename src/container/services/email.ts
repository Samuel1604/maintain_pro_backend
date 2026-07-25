import { EmailService } from "@/shared/services/email/email.service.js";
import { RedisService } from "@/shared/services/redis.service.js";
import { Resend } from "resend";
import { env } from "@/config/env.js";

export const redisService = new RedisService();
const resend = new Resend(env.RESEND_API_KEY);
export const emailService = new EmailService(
    redisService,
    resend
)
