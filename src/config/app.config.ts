import { env } from "./env.js";

export const appConfig = {
  port: env.PORT,

  nodeEnv: env.NODE_ENV,

  clientUrl: env.CLIENT_URL,

  isProduction: env.NODE_ENV === "production",
};
