import { UserRepository } from "@/modules/users/user.repository.js";
import type { Logger } from "@/infrastructure/logging/logger.interface.js";

/** Removes expired temporary invitation users on a five-minute schedule. */
export class CleanupTempUsersJob {
  private readonly INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly userRepository: UserRepository,
    private readonly logger?: Logger,
  ) {}

  start(): void {
    if (this.intervalId) return;

    this.intervalId = setInterval(() => {
      this.run().catch((err) => {
        this.logger?.error("[CleanupTempUsers] Job failed", { err });
      });
    }, this.INTERVAL_MS);

    // Run once immediately after startup.
    this.run().catch((err) => {
      this.logger?.error("[CleanupTempUsers] Initial run failed", { err });
    });

    this.logger?.info("[CleanupTempUsers] Scheduled — runs every 5 minutes");
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private async run(): Promise<void> {
    const deleted = await this.userRepository.deleteExpiredTempUsers();
    if (deleted > 0) {
      this.logger?.info("[CleanupTempUsers] Deleted expired temp-invitation users", { count: deleted });
    }
  }
}
