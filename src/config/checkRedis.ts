import { redis } from "./redis.js";

/**
 * Verifies Redis availability during application startup.
 *
 * Application should not start if Redis is unavailable.
 */
export async function checkRedis() {
  try {
    const response = await redis.ping();

    if (response !== "PONG") {
      throw new Error("Redis ping failed");
    }

    console.log("✅ Redis health check passed");
  } catch (error) {
    console.error("❌ Redis health check failed");
    console.error(error);

    process.exit(1);
  }
}
