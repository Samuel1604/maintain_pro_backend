import { z } from "zod";
import {
  emailSchema,
  otpSchema,
  passwordSchema,
  registrationPasswordSchema,
  passwordConfirmation,
} from "@/shared/validators/index.js";

const forgotPasswordBodySchema = z.object({
  email: emailSchema,
});

export const forgotPasswordSchema = z.object({
  body: forgotPasswordBodySchema,
});

export type ForgotPasswordDto = z.infer<typeof forgotPasswordBodySchema>;

const resetPasswordBodySchema = z.object({
  email: emailSchema,
  otp: otpSchema,
  newPassword: registrationPasswordSchema,
});

export const resetPasswordSchema = z.object({
  body: resetPasswordBodySchema,
});

export type ResetPasswordDto = z.infer<typeof resetPasswordBodySchema>;

const changePasswordBodySchema = passwordConfirmation(
  z.object({
    currentPassword: passwordSchema,
    newPassword: registrationPasswordSchema,
    confirmNewPassword: passwordSchema,
  }),
  "newPassword",
  "confirmNewPassword",
);

export const changePasswordSchema = z.object({
  body: changePasswordBodySchema,
});

export type ChangePasswordDto = z.infer<typeof changePasswordBodySchema>;

const changeEmailBodySchema = z.object({
  newEmail: emailSchema,
});

export const changeEmailSchema = z.object({
  body: changeEmailBodySchema,
});

export type ChangeEmailDto = z.infer<typeof changeEmailBodySchema>;

const verifyEmailChangeBodySchema = z.object({
  otp: otpSchema,
});

export const verifyEmailChangeSchema = z.object({
  body: verifyEmailChangeBodySchema,
});

export type VerifyEmailChangeDto = z.infer<
  typeof verifyEmailChangeBodySchema
>;
