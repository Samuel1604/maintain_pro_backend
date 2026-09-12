// ─── Billing Configuration ─────────────────────────────────────────────────────
//
// Centralised constants for the Billing module.
// Provider-specific configuration does NOT belong here.

export const BILLING_CONFIG = {
  /**
   * Default trial period in days granted on new subscriptions if plan duration is unspecified.
   */
  TRIAL_PERIOD_DAYS: 14,

  /**
   * Trial durations in days categorized by tenant type and plan tier.
   * Vendor:
   *   - Free: 0 days (0 months)
   *   - Starter: 90 days (3 months)
   *   - Professional: 180 days (6 months)
   *   - Enterprise: 180 days (6 months)
   * Organization:
   *   - Free: 0 days (0 months)
   *   - Starter: 180 days (6 months)
   *   - Professional: 180 days (6 months)
   *   - Enterprise: 270 days (9 months)
   */
  PLAN_TRIAL_PERIOD_DAYS: {
    vendor: {
      free: 0,
      starter: 90,
      professional: 180,
      enterprise: 180,
    },
    organization: {
      free: 0,
      starter: 180,
      professional: 180,
      enterprise: 270,
    },
  } as Record<string, Record<string, number>>,

  /**
   * Annual plan discount percentage.
   */
  ANNUAL_DISCOUNT_PERCENT: 20,

  /**
   * Base monthly prices (USD) per tenant type and plan tier.
   */
  PLAN_PRICES_USD_MONTHLY: {
    organization: {
      free: 0,
      starter: 29,
      professional: 59,
      enterprise: 59,
    },
    vendor: {
      free: 0,
      starter: 19,
      professional: 39,
      enterprise: 39,
    },
  } as Record<string, Record<string, number>>,

  /**
   * The default provider used when no provider is supplied.
   */
  DEFAULT_PROVIDER: "mock",
} as const;
