import { z } from "zod";

export const emailSchema = z
  .email("Invalid email address")
  .trim()
  .toLowerCase()
  .max(255, "Email is too long");

export const passwordSchema = z
  .string()
  .trim()
  .min(8, "Password must be at least 8 characters")
  .max(100, "Password cannot exceed 100 characters")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[0-9]/, "Password must contain at least one number");

export const otpSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "OTP must be exactly 6 digits");
