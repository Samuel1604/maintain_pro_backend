import { z } from "zod";
import { emailSchema, otpSchema } from "@/shared/validators/index.js";

const verifyOtpBodySchema = z.object({
  email: emailSchema,
  otp: otpSchema,
});

export const verifyOtpSchema = z.object({
  body: verifyOtpBodySchema,
});

export type VerifyOtpDto = z.infer<typeof verifyOtpBodySchema>;

const resendOtpBodySchema = z.object({
  email: emailSchema,
});

export const resendOtpSchema = z.object({
  body: resendOtpBodySchema,
});

export type ResendOtpDto = z.infer<typeof resendOtpBodySchema>;
