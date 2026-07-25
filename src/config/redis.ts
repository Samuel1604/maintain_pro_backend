import { Redis } from "ioredis";
import { redisConfig } from "@/config/redis.config.js";

/**
 * Shared Redis connection
 *
 * Used for:
 * - OTPs
 * - Rate limiting
 * - Caching
 * - Sessions
 * - BullMQ queues
 */
export const redis = new Redis({

  host: redisConfig.host,
  port: redisConfig.port,
  username: redisConfig.username,
  password: redisConfig.password,

  /**
   * Number of retries before failing a request.
   */
  maxRetriesPerRequest: 3,

  /**
   * Ensures Redis is fully ready before accepting commands.
   */
  enableReadyCheck: true,

  /**
   * Connect immediately when application starts.
   */
  lazyConnect: false,

  /**
   * Redis Cloud requires TLS encryption.
   */
   ...(redisConfig.tls && {
     tls: {
       servername: redisConfig.host,
     },
  }),
});



/**
 * Fired when TCP connection is established.
 */
redis.on("connect", async() => {
  console.log("✅ Redis connected");
});



/**
 * Fired when Redis is fully ready to accept commands.
 */
redis.on("ready", () => {
  console.log("✅ Redis ready");
});




/**
 * Fired whenever Redis encounters an error.
 */
redis.on("error", (error: unknown) => {
  console.error("❌ Redis error:", error);
});

/**
 * Fired when Redis connection closes.
 */
redis.on("close", () => {
  console.warn("⚠️ Redis connection closed");
});
