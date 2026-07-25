export const AUTH_LOG_ACTIONS = {
  // Login
  LOGIN: "login",
  LOGIN_FAILED: "login_failed",
  LOGOUT: "logout",
  LOGOUT_ALL: "logout_all",

  // Registration
  REGISTER: "register",

  // OAuth
  OAUTH_LOGIN: "oauth_login",
    OAUTH_SIGNUP_ORGANIZATION: "oauth_signup_organization",
    OAUTH_SIGNUP_VENDOR: "oauth_signup_vendor",

  // Invitations
  INVITATION_ACCEPTED: "invitation_accepted",
  OAUTH_INVITATION_ACCEPTED: "oauth_invitation_accepted",

  // Sessions
  SESSION_CREATED: "session_created",
  SESSION_REFRESHED: "session_refreshed",
  SESSION_REVOKED: "session_revoked",

  // Provider Linking
  OAUTH_PROVIDER_LINKED: "oauth_provider_linked",
  OAUTH_PROVIDER_UNLINKED: "oauth_provider_unlinked",
} as const;
