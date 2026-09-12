export const PAYMENT_STATUSES = [
  "pending",
  "succeeded",
  "failed",
  "expired",
] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
