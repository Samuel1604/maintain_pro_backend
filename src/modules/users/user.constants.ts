export const USER_AUDIT_ACTIONS = {
  USER_CREATED: "user_created",
  USER_UPDATED: "user_updated",

  EMAIL_CHANGED: "email_changed",

  PASSWORD_CHANGED: "password_changed",
  PASSWORD_RESET: "password_reset",

  ROLE_CHANGED: "role_changed",

  USER_ACTIVATED: "user_activated",
  USER_SUSPENDED: "user_suspended",

  USER_DELETED: "user_deleted",
} as const;
