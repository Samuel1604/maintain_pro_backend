export const PAYMENT_PROVIDERS = [
  "mock",
  "stripe",
  "paystack",
  "flutterwave",
] as const;

export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[number];
