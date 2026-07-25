import { env } from "./env.js";

export const redisConfig = {
  host: env.REDIS_HOST,

  port: env.REDIS_PORT,

  username: env.REDIS_USERNAME,

  password: env.REDIS_PASSWORD,

  tls: env.REDIS_TLS,
};
