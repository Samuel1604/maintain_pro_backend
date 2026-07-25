export const AUTH_AUDIT_ACTIONS = {
  PASSWORD_CHANGED: "password_changed",
  PASSWORD_RESET: "password_reset",

  ACCOUNT_LOCKED: "account_locked",
  ACCOUNT_UNLOCKED: "account_unlocked",

  SESSION_REVOKED: "session_revoked",

  LOGOUT_ALL: "logout_all",

  OAUTH_LOGIN: "oauth_login",

  OAUTH_SIGNUP: "oauth_signup",

  OAUTH_INVITATION_ACCEPTED: "oauth_invitation_accepted",

  OAUTH_PROVIDER_LINKED: "oauth_provider_linked",

  OAUTH_PROVIDER_UNLINKED: "oauth_provider_unlinked",
} as const;
