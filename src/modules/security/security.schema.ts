import { z } from "zod";

import {
  emailSchema,
  passwordSchema,
  otpSchema,
} from "@/shared/validators/auth.js";

import { passwordConfirmation } from "@/shared/validators/password.js";

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export type ForgetPasswordDto = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = passwordConfirmation(
  z.object({
    email: emailSchema,

    otp: otpSchema,

    newPassword: passwordSchema,

    confirmPassword: passwordSchema,
  }),
  "newPassword",
  "confirmPassword",
);

export type ResetPasswordDto = z.infer<typeof resetPasswordSchema>;

export const changePasswordSchema = passwordConfirmation(
  z.object({
    currentPassword: passwordSchema,
    newPassword: passwordSchema,
    confirmPassword: passwordSchema,
  }),
  "newPassword",
  "confirmPassword",
);

export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;

export const changeEmailSchema = z.object({
  newEmail: emailSchema,
});

export type ChangeEmailDto = z.infer<typeof changeEmailSchema>;
