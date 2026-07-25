import { config } from "dotenv";
import { z } from "zod";
import type { StringValue } from "ms";

config();


const durationSchema =
  z.custom<StringValue>();


const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]),

  PORT: z.coerce.number(),

  CLIENT_URL: z.string(),

  JWT_ACCESS_SECRET: z.string().min(32),

  JWT_REFRESH_SECRET: z.string().min(32),

  OAUTH_STATE_SECRET: z.string().min(32),

  JWT_ACCESS_EXPIRES_IN: durationSchema,

  JWT_REFRESH_EXPIRES_IN: durationSchema,

  OAUTH_STATE_EXPIRES_IN: durationSchema,

  REDIS_HOST: z.string(),
  REDIS_PORT: z.coerce.number(),
  REDIS_USERNAME: z.string(),
  REDIS_PASSWORD: z.string(),

  RESEND_API_KEY: z.string(),

  REDIS_TLS: z.string(),
  // REDIS_TLS_REJECT_UNAUTHORIZED: z.boolean().default(false),

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
});

export const env = envSchema.parse(process.env);
