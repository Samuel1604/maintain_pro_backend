import { env } from "./env.js";

/** Validate deployment-only assumptions before opening the HTTP port. */
export function validateProductionEnvironment(): void {
  if (env.NODE_ENV !== "production") return;

  const errors: string[] = [];
  const urls = [env.CLIENT_URL, env.FRONTEND_URL].filter(
    (value): value is string => Boolean(value),
  );
  if (urls.some((url) => !url.startsWith("https://"))) {
    errors.push("CLIENT_URL and FRONTEND_URL must use HTTPS in production");
  }
  if (
    env.MAIL_PROVIDER === "smtp" &&
    /mailpit|localhost|127\.0\.0\.1/i.test(env.MAIL_HOST ?? "")
  ) {
    errors.push("MAIL_HOST cannot point to Mailpit or localhost in production");
  }
  if (env.MAIL_PROVIDER === "mailforge" && !env.MAILFORGE_URL?.startsWith("https://")) {
    errors.push("MAILFORGE_URL must use HTTPS in production");
  }
  if (!env.REDIS_URL && (env.REDIS_HOST === "localhost" || env.REDIS_HOST === "127.0.0.1")) {
    errors.push("REDIS_HOST cannot point to localhost in production");
  }
  if (["true", "1", "yes"].includes(process.env.REDIS_DISABLE_CONNECTION?.trim().toLowerCase() ?? "")) {
    errors.push("REDIS_DISABLE_CONNECTION must be disabled in production");
  }
  if (env.QUEUE_DRIVER === "in-memory") {
    errors.push("QUEUE_DRIVER=in-memory is not allowed in production");
  }
  if (/localhost|127\.0\.0\.1/i.test(env.MONGODB_URI)) {
    errors.push("MONGODB_URI cannot point to localhost in production");
  }
  if (env.TUNNEL_AUTOSTART || env.TUNNEL_PROVIDER !== "none") {
    errors.push("TUNNEL_AUTOSTART and TUNNEL_PROVIDER must be disabled in production");
  }
  if (env.BILLING_DEFAULT_PROVIDER === "mock") {
    errors.push("BILLING_DEFAULT_PROVIDER cannot be mock in production");
  }
  const billingCredentials: Record<string, string | undefined> = {
    stripe: env.STRIPE_SECRET_KEY,
    paystack: env.PAYSTACK_SECRET_KEY,
    flutterwave: env.FLUTTERWAVE_SECRET_KEY,
  };
  if (
    env.BILLING_DEFAULT_PROVIDER !== "mock" &&
    !billingCredentials[env.BILLING_DEFAULT_PROVIDER]
  ) {
    errors.push(
      `${env.BILLING_DEFAULT_PROVIDER.toUpperCase()}_SECRET_KEY is required when BILLING_DEFAULT_PROVIDER=${env.BILLING_DEFAULT_PROVIDER}`,
    );
  }
  if (env.BILLING_DEFAULT_PROVIDER === "stripe" && !env.STRIPE_WEBHOOK_SECRET) {
    errors.push("STRIPE_WEBHOOK_SECRET is required when BILLING_DEFAULT_PROVIDER=stripe");
  }
  if (
    env.BILLING_DEFAULT_PROVIDER === "flutterwave" &&
    !env.FLUTTERWAVE_WEBHOOK_SECRET_HASH
  ) {
    errors.push(
      "FLUTTERWAVE_WEBHOOK_SECRET_HASH is required when BILLING_DEFAULT_PROVIDER=flutterwave",
    );
  }
  if (errors.length)
    throw new Error(`Production configuration invalid: ${errors.join("; ")}`);
}
