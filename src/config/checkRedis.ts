import { redis } from "./redis.js";
import { ConsoleLogger } from "@/infrastructure/logging/console.logger.js";

const logger = new ConsoleLogger();

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

    logger.info("Redis health check passed");
  } catch (error) {
    logger.error("Redis health check failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
