import { z } from "zod";

// verify otp dto
export const verifyOtpSchema = z.object({
  email: z.email(),
  otp: z.string(),
});

export type VerifyOtpDto = z.infer<typeof verifyOtpSchema>;

// resend otp dto
export const resendOtpSchema = z.object({
  email: z.email(),
});

export type ResendOtpDto = z.infer<typeof resendOtpSchema>;

// forgot-password dto
export const forgotPasswordSchema = z.object({
  email: z.email(),
});

export type ForgotPasswordDto = z.infer<typeof forgotPasswordSchema>;

// reset-password dto

export const resetPasswordSchema = z.object({
  email: z.email(),

  otp: z.string().length(6),

  password: z.string().min(8).max(100),
});

export type ResetPasswordDto = z.infer<typeof resetPasswordSchema>;
