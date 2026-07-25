export const AUTH_PROVIDERS = {
  LOCAL: "local",
  GOOGLE: "google",
  LINKEDIN: "linkedin",
  APPLE: "apple",
} as const;

export type AuthProvider = (typeof AUTH_PROVIDERS)[keyof typeof AUTH_PROVIDERS];
