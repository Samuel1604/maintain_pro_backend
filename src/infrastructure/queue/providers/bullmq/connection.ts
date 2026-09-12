import type { ConnectionOptions } from "bullmq";
import { env } from "@/config/env.js";

export function createBullMqConnection(): ConnectionOptions {
  const redisUrl = env.REDIS_URL || process.env.REDIS_URL;
  const isTls = redisUrl ? redisUrl.startsWith("rediss://") : env.REDIS_TLS === "true";
  const rejectUnauthorized = env.REDIS_TLS_REJECT_UNAUTHORIZED !== "false";

  if (redisUrl) {
    return {
      url: redisUrl,
      maxRetriesPerRequest: null,
      connectTimeout: 10_000,
      ...(isTls && {
        tls: {
          rejectUnauthorized,
        },
      }),
    };
  }

  return {
    host: env.REDIS_HOST ?? process.env.REDIS_HOST ?? "localhost",
    port: Number(env.REDIS_PORT ?? process.env.REDIS_PORT ?? 6379),
    username: env.REDIS_USERNAME ?? process.env.REDIS_USERNAME,
    password: env.REDIS_PASSWORD ?? process.env.REDIS_PASSWORD,
    maxRetriesPerRequest: null,
    connectTimeout: 10_000,
    ...(isTls
      ? {
          tls: {
            servername: env.REDIS_HOST ?? process.env.REDIS_HOST,
            rejectUnauthorized,
          },
        }
      : {}),
  };
}
