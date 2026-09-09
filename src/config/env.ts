import { config } from "dotenv";
import { z } from "zod";
import type { StringValue } from "ms";

// The test bootstrap loads .env.test before application modules are imported.
// Do not load a developer's .env afterward and overwrite disposable test
// service settings.
if (process.env.NODE_ENV !== "test") config();


const durationSchema =
  z.custom<StringValue>();


const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]),

  PORT: z.coerce.number(),

  CLIENT_URL: z.string(),

  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),

  JWT_ACCESS_SECRET: z.string().min(32),

  JWT_REFRESH_SECRET: z.string().min(32),

  OAUTH_STATE_SECRET: z.string().min(32),

  JWT_ACCESS_EXPIRES_IN: durationSchema,

  JWT_REFRESH_EXPIRES_IN: durationSchema,

  OAUTH_STATE_EXPIRES_IN: durationSchema,

  REDIS_URL: z
    .string()
    .optional()
    .refine((value) => {
      if (!value) return true;
      try {
        const parsed = new URL(value);
        return parsed.protocol === "redis:" || parsed.protocol === "rediss:";
      } catch {
        return false;
      }
    }, "REDIS_URL must be a valid redis:// or rediss:// URL"),
  REDIS_HOST: z.string().optional().default("localhost"),
  REDIS_PORT: z.coerce.number().optional().default(6379),
  REDIS_USERNAME: z.string().optional().default(""),
  REDIS_PASSWORD: z.string().optional().default(""),

  MAIL_PROVIDER: z.enum(["smtp", "brevo", "mailforge", "noop"]).default("smtp"),
  BREVO_API_KEY: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  MAILFORGE_URL: z.string().url().optional(),
  MAILFORGE_ACCOUNT_ID: z.string().optional(),
  MAILFORGE_API_KEY: z.string().optional(),

  // Generic SMTP (Nodemailer) — used for Mailpit in development and for
  // any real SMTP endpoint (Gmail, Resend, Brevo, SES, Postmark, ...) in
  // other environments. Auth is optional: MAIL_USER/MAIL_PASSWORD are only
  // required together, never on their own, and Mailpit needs neither.
  MAIL_HOST: z.string().optional(),
  MAIL_PORT: z.coerce.number().default(587),
  MAIL_SECURE: z.coerce.boolean().default(false),
  MAIL_USER: z.string().optional(),
  MAIL_PASSWORD: z.string().optional(),

  MAIL_FROM_NAME: z.string().default("MaintainPro"),
  MAIL_FROM_EMAIL: z.email(),
  FRONTEND_URL: z.string().optional(),

  REDIS_TLS: z.string().optional().default("false"),
  REDIS_TLS_REJECT_UNAUTHORIZED: z.string().optional().default("true"),
  QUEUE_DRIVER: z.enum(["bullmq", "in-memory"]).default("bullmq"),
  BILLING_DEFAULT_PROVIDER: z.enum(["mock", "stripe", "paystack", "flutterwave"]).default("mock"),

  // Public tunnel is opt-in. The command is intentionally provider-neutral so
  // ngrok can be replaced with cloudflared without changing server bootstrap.
  TUNNEL_PROVIDER: z.enum(["none", "ngrok", "cloudflare"]).default("none"),
  TUNNEL_AUTOSTART: z.coerce.boolean().default(false),
  TUNNEL_PORT: z.coerce.number().optional(),

  // AWS_REGION: z.string(),
  // AWS_ACCESS_KEY_ID: z.string(),
  // AWS_SECRET_ACCESS_KEY: z.string(),
  // AWS_S3_BUCKET: z.string(),

  

  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
  GOOGLE_CLIENT_REDIRECT_URI: z.string(),

  LINKEDIN_CLIENT_ID: z.string().optional(),
  LINKEDIN_CLIENT_SECRET: z.string().optional(),
  LINKEDIN_CLIENT_REDIRECT_URI: z.string().optional(),

  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  CLOUDINARY_FOLDER_PREFIX: z.string().default("maintainpro"),

  // Payment providers are optional until selected by billing configuration.
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  PAYSTACK_SECRET_KEY: z.string().optional(),
  FLUTTERWAVE_SECRET_KEY: z.string().optional(),
  FLUTTERWAVE_WEBHOOK_SECRET_HASH: z.string().optional(),
});

export const env = envSchema
  .superRefine((data, ctx) => {
    if (data.MAIL_PROVIDER === "smtp") {
      if (!data.MAIL_HOST) {
        ctx.addIssue({ code: "custom", path: ["MAIL_HOST"], message: "MAIL_HOST is required when MAIL_PROVIDER=smtp" });
      }
      const hasUser = Boolean(data.MAIL_USER);
      const hasPassword = Boolean(data.MAIL_PASSWORD);
      if (hasUser !== hasPassword) {
        ctx.addIssue({
          code: "custom",
          path: ["MAIL_PASSWORD"],
          message:
            "MAIL_USER and MAIL_PASSWORD must be set together, or both left unset for unauthenticated SMTP (e.g. Mailpit)",
        });
      }
    }
    if (data.MAIL_PROVIDER === "brevo" && !data.BREVO_API_KEY) {
      ctx.addIssue({
        code: "custom",
        path: ["BREVO_API_KEY"],
        message: "BREVO_API_KEY is required when MAIL_PROVIDER=brevo",
      });
    }
    if (data.MAIL_PROVIDER === "mailforge") {
      if (!data.MAILFORGE_URL) ctx.addIssue({ code: "custom", path: ["MAILFORGE_URL"], message: "MAILFORGE_URL is required when MAIL_PROVIDER=mailforge" });
      if (!data.MAILFORGE_ACCOUNT_ID) ctx.addIssue({ code: "custom", path: ["MAILFORGE_ACCOUNT_ID"], message: "MAILFORGE_ACCOUNT_ID is required when MAIL_PROVIDER=mailforge" });
      if (!data.MAILFORGE_API_KEY) ctx.addIssue({ code: "custom", path: ["MAILFORGE_API_KEY"], message: "MAILFORGE_API_KEY is required when MAIL_PROVIDER=mailforge" });
    }

  })
  .parse(process.env);
