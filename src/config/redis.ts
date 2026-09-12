import { Redis } from "ioredis";
import { redisConfig } from "@/config/redis.config.js";
import { ConsoleLogger } from "@/infrastructure/logging/console.logger.js";

const logger = new ConsoleLogger();

const redisUrlHostname = redisConfig.url
  ? (() => {
      try {
        return new URL(redisConfig.url).hostname;
      } catch {
        return undefined;
      }
    })()
  : undefined;

const redisOptions = {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  connectTimeout: 10_000,
  // Reconnect in the background without hammering an unavailable provider.
  retryStrategy: (attempt: number) => Math.min(5_000, 250 * 2 ** Math.min(attempt - 1, 5)),
  lazyConnect: ["true", "1", "yes"].includes(
    process.env.REDIS_DISABLE_CONNECTION?.trim().toLowerCase() ?? "",
  ),
  ...(redisConfig.tls && {
    tls: {
      servername: redisUrlHostname ?? redisConfig.host,
      rejectUnauthorized: redisConfig.rejectUnauthorized,
    },
  }),
};

/** Shared Redis connection for cache, sessions, limits, OTPs, and queues. */
export const redis = redisConfig.url
  ? new Redis(redisConfig.url, redisOptions)
  : new Redis({
      host: redisConfig.host,
      port: redisConfig.port,
      username: redisConfig.username,
      password: redisConfig.password,
      ...redisOptions,
    });



/** Log when the TCP connection is established. */
redis.on("connect", async() => {
  logger.info("Redis connected");
});



/** Log when Redis can accept commands and verify maxmemory-policy. */
redis.on("ready", async () => {
  logger.info("Redis ready");

  try {
    const policyResult = (await redis.config("GET", "maxmemory-policy")) as string[];
    if (Array.isArray(policyResult) && policyResult.length >= 2) {
      const currentPolicy = policyResult[1];
      logger.info("Redis maxmemory policy inspected", { policy: currentPolicy });

      if (currentPolicy !== "noeviction") {
        try {
          await redis.config("SET", "maxmemory-policy", "noeviction");
          logger.info("Configured Redis maxmemory policy", { policy: "noeviction" });
        } catch {
          logger.warn("Could not configure Redis maxmemory policy; configure it in the managed Redis dashboard", {
            policy: "noeviction",
          });
        }
      }
    }
  } catch {
    // Managed Redis providers (e.g. Upstash, Redis Cloud) may disable CONFIG commands.
  }
});




/** Log Redis connection errors. */
redis.on("error", (error: unknown) => {
  const code = error instanceof Error && "code" in error ? String((error as Error & { code?: unknown }).code) : "unknown";
  // ETIMEDOUT means the provider is unreachable, not that application data
  // has expired. Keep the message actionable and avoid dumping a stack on
  // every reconnect attempt.
  logger.error("Redis connection error; check REDIS_URL, TLS, and network access", { code });
});

/** Log when the Redis connection closes. */
redis.on("close", () => {
  logger.warn("Redis connection closed");
});
