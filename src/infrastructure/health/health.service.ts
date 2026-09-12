import mongoose from "mongoose";
import { redis } from "@/config/redis.js";

export type DependencyHealth = {
  status: "up" | "down" | "disabled";
  latencyMs?: number;
  error?: string;
};

export class HealthService {
  async liveness() {
    return { status: "ok" as const, uptimeSeconds: Math.floor(process.uptime()) };
  }

  async readiness() {
    const dependencies: Record<string, DependencyHealth> = {
      mongodb: this.mongoHealth(),
      redis: await this.redisHealth(),
    };
    // Disabled integrations are intentional configuration, not an outage.
    // Required dependencies report "down" and keep readiness at 503.
    const ready = Object.values(dependencies).every((item) => item.status !== "down");
    return { ready, dependencies };
  }

  private mongoHealth(): DependencyHealth {
    return mongoose.connection.readyState === 1
      ? { status: "up" }
      : { status: "down", error: `connection state ${mongoose.connection.readyState}` };
  }

  private async redisHealth(): Promise<DependencyHealth> {
    if (["true", "1", "yes"].includes(process.env.REDIS_DISABLE_CONNECTION?.trim().toLowerCase() ?? "")) {
      return { status: "disabled" };
    }
    const started = Date.now();
    try {
      await redis.ping();
      return { status: "up", latencyMs: Date.now() - started };
    } catch (error) {
      return { status: "down", latencyMs: Date.now() - started, error: String(error) };
    }
  }
}
