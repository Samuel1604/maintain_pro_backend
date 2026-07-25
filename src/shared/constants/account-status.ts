export const ACCOUNT_STATUS = {
  PENDING_VERIFICATION: "pending_verification",
  ACTIVE: "active",
    INACTIVE: "inactive",
  SUSPENDED: "suspended",
  DEACTIVATED: "deactivated",
} as const;

export type AccountStatus =
  (typeof ACCOUNT_STATUS)[keyof typeof ACCOUNT_STATUS];
