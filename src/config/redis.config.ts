import { env } from "./env.js";

export const redisConfig = {
  url: env.REDIS_URL || process.env.REDIS_URL,

  host: env.REDIS_HOST,

  port: env.REDIS_PORT,

  username: env.REDIS_USERNAME,

  password: env.REDIS_PASSWORD,

  // A complete URL is authoritative: `redis://` is plaintext and
  // `rediss://` is TLS. Do not let a stale REDIS_TLS=true override it.
  tls: (env.REDIS_URL || process.env.REDIS_URL)
    ? (env.REDIS_URL || process.env.REDIS_URL)?.startsWith("rediss://") === true
    : env.REDIS_TLS === "true",

  rejectUnauthorized: env.REDIS_TLS_REJECT_UNAUTHORIZED !== "false",
};
