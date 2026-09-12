import type { Logger } from "@/infrastructure/logging/logger.interface.js";

export interface LocalTaskQueueOptions {
  /** Max tasks running at once. Default 1 (strict FIFO, one at a time). */
  concurrency?: number;
  name?: string;
}

/**
 * LocalTaskQueue
 *
 * Tier 2 of the event-processing architecture: process-local buffering and
 * flow control. NOT an event bus, NOT a job queue — it has no concept of
 * "event", no persistence, no retry policy, and nothing here survives a
 * process restart.
 *
 * Use this for temporary, non-business-critical flow control that lives
 * entirely within one process's lifetime — e.g. capping how many
 * concurrent outbound calls a piece of infra makes, or smoothing a burst
 * of same-tick work into a bounded number of in-flight tasks. If losing
 * the queued work on a crash/restart would be a real problem, it belongs
 * on Tier 3 (BullMQ) instead — that is the line between these two tiers.
 *
 * A task's failure is reported via `onError` (if provided) rather than
 * thrown from `enqueue()`, since by design nothing awaits an individual
 * queued task from the outside — this is fire-and-forget buffering, not a
 * request/response mechanism.
 */
export class LocalTaskQueue {
  private readonly concurrency: number;
  private readonly name: string;
  private readonly pending: Array<() => Promise<void>> = [];
  private active = 0;

  constructor(
    options: LocalTaskQueueOptions = {},
    private readonly logger?: Logger,
  ) {
    this.concurrency = Math.max(1, options.concurrency ?? 1);
    this.name = options.name ?? "local-task-queue";
  }

  /** Number of tasks buffered and not yet started. */
  get size(): number {
    return this.pending.length;
  }

  /** Number of tasks currently running. */
  get running(): number {
    return this.active;
  }

  enqueue(task: () => Promise<void> | void, onError?: (error: unknown) => void): void {
    this.pending.push(async () => {
      try {
        await task();
      } catch (error) {
        this.logger?.error(`[LocalTaskQueue:${this.name}] Task failed`, {
          error: error instanceof Error ? error.message : String(error),
        });
        onError?.(error);
      }
    });

    this.drain();
  }

  /** Resolves once every currently-buffered task has finished (tasks enqueued after this call are not waited on). */
  async onIdle(): Promise<void> {
    if (this.active === 0 && this.pending.length === 0) {
      return;
    }
    await new Promise<void>((resolve) => {
      const check = () => {
        if (this.active === 0 && this.pending.length === 0) {
          resolve();
        } else {
          setTimeout(check, 10);
        }
      };
      check();
    });
  }

  private drain(): void {
    while (this.active < this.concurrency && this.pending.length > 0) {
      const next = this.pending.shift();
      if (!next) break;

      this.active++;
      void next().finally(() => {
        this.active--;
        this.drain();
      });
    }
  }
}
