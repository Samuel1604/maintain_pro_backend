import { env } from "./env.js";

export const oauthConfig = {
  google: {
    clientId: env.GOOGLE_CLIENT_ID,

    clientSecret: env.GOOGLE_CLIENT_SECRET,

    redirectUri: env.GOOGLE_CLIENT_REDIRECT_URI,
  },

  linkedin: {
    clientId: env.LINKEDIN_CLIENT_ID,

    clientSecret: env.LINKEDIN_CLIENT_SECRET,

    clientRedirect: env.LINKEDIN_CLIENT_REDIRECT_URI,
  },

  clientUrl: env.CLIENT_URL,

  stateSecret: env.OAUTH_STATE_SECRET,

  stateExpiresIn: env.OAUTH_STATE_EXPIRES_IN,
};
