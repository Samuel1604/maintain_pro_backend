export const SECURITY_ACTIONS = {
  ACCOUNT_LOCKED: "account_locked",
  ACCOUNT_UNLOCKED: "account_unlocked",

  TOKEN_REUSE_DETECTED: "token_reuse_detected",

  SUSPICIOUS_LOGIN: "suspicious_login",

  NEW_DEVICE_LOGIN: "new_device_login",

  MULTIPLE_FAILED_LOGINS: "multiple_failed_logins",

  PASSWORD_BREACH_DETECTED: "password_breach_detected",
} as const;
