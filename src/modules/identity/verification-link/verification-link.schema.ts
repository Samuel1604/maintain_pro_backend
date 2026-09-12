import { z } from "zod";
import { emailSchema } from "@/shared/validators/index.js";

// ─── Verify by Link ───────────────────────────────────────────────────────────

const verifyLinkBodySchema = z.object({
  email: emailSchema,
  token: z.string().min(1, "Token is required"),
});

export const verifyLinkSchema = z.object({
  body: verifyLinkBodySchema,
});

export type VerifyLinkDto = z.infer<typeof verifyLinkBodySchema>;

// ─── Regenerate Verification Link ─────────────────────────────────────────────

const regenerateVerificationBodySchema = z.object({
  email: emailSchema,
});

export const regenerateVerificationSchema = z.object({
  body: regenerateVerificationBodySchema,
});

export type RegenerateVerificationDto = z.infer<typeof regenerateVerificationBodySchema>;
