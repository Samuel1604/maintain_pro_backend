import type { JobsOptions } from "bullmq";

export const QUEUE_NAMES = {
  EMAIL: "email",
  NOTIFICATION: "notification",
  AUDIT: "audit",
  ANALYTICS: "analytics",
  MARKETPLACE: "marketplace",
  BILLING: "billing",
  AI: "ai",
  REPORTS: "reports",
  EVENTS: "domain-events",
  EVENTS_DLQ: "domain-events.dlq",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export interface QueueRuntimeConfig {
  name: QueueName;
  concurrency: number;
  defaultJobOptions: JobsOptions;
  workerTimeoutMs: number;
  lockDurationMs: number;
  lockRenewTimeMs: number;
  limiter?: { max: number; duration: number };
}

export const defaultJobOptions: JobsOptions = {
  attempts: 5,
  backoff: {
    type: "exponential",
    delay: 2_000,
  },
  removeOnComplete: {
    age: 24 * 60 * 60,
    count: 1_000,
  },
  removeOnFail: {
    age: 7 * 24 * 60 * 60,
    count: 5_000,
  },
};

/** BullMQ priority policy: lower numbers run first. */
export const QUEUE_PRIORITIES = { critical: 1, normal: 5, low: 10 } as const;

export const queueConfigs: Record<QueueName, QueueRuntimeConfig> = {
  [QUEUE_NAMES.EMAIL]: createQueueConfig(QUEUE_NAMES.EMAIL, 5, { max: 30, duration: 1000 }),
  [QUEUE_NAMES.NOTIFICATION]: createQueueConfig(QUEUE_NAMES.NOTIFICATION, 10),
  [QUEUE_NAMES.AUDIT]: createQueueConfig(QUEUE_NAMES.AUDIT, 10),
  [QUEUE_NAMES.ANALYTICS]: createQueueConfig(QUEUE_NAMES.ANALYTICS, 10),
  [QUEUE_NAMES.MARKETPLACE]: createQueueConfig(QUEUE_NAMES.MARKETPLACE, 5),
  [QUEUE_NAMES.BILLING]: createQueueConfig(QUEUE_NAMES.BILLING, 5),
  [QUEUE_NAMES.AI]: createQueueConfig(QUEUE_NAMES.AI, 2, { max: 5, duration: 1000 }),
  [QUEUE_NAMES.REPORTS]: createQueueConfig(QUEUE_NAMES.REPORTS, 3),
  [QUEUE_NAMES.EVENTS]: createQueueConfig(QUEUE_NAMES.EVENTS, 20),
  [QUEUE_NAMES.EVENTS_DLQ]: createQueueConfig(QUEUE_NAMES.EVENTS_DLQ, 1),
};

function configuredConcurrency(name: QueueName, fallback: number): number {
  const key = `${name.replace(/[^a-zA-Z0-9]+/g, "_").toUpperCase()}_CONCURRENCY`;
  const value = Number(process.env[key] ?? fallback);
  if (!Number.isFinite(value) || value < 1) throw new Error(`${key} must be a positive integer`);
  return Math.min(100, Math.floor(value));
}

function createQueueConfig(name: QueueName, concurrency: number, limiter?: { max: number; duration: number }): QueueRuntimeConfig {
  return {
    name,
    concurrency: configuredConcurrency(name, concurrency),
    defaultJobOptions,
    workerTimeoutMs: 30_000,
    lockDurationMs: 60_000,
    lockRenewTimeMs: 20_000,
    limiter,
  };
}
