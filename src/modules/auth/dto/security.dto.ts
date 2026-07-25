import { z } from "zod";
export const changePasswordSchema = z.object({
  currentPassword: z
    .string()
    .min(8),

  newPassword: z
    .string()
    .min(8)
    .max(100),
});

export const forgetPasswordSchema = z.object({
  email: z.email(),
});

export const resetPasswordSchema = z.object({
  email: z.email(),
  otp: z.string().length(6),
  newPassword: z
    .string()
    .min(8)
    .max(100),
})

export const changeEmailSchema = z.object({
  newEmail: z.email()
});
export type ChangePasswordDto =
  z.infer<typeof changePasswordSchema>;

export type ForgetPasswordDto =
  z.infer<typeof forgetPasswordSchema>;

export type ResetPasswordDto =
  z.infer<typeof resetPasswordSchema>;

export type ChangeEmailDto = 
  z.infer<typeof changeEmailSchema>;