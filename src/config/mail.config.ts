import { env } from "./env.js";

export const mailConfig = {
  apiKey: env.RESEND_API_KEY,

  from: `${env.MAIL_FROM_NAME} <${env.MAIL_FROM_EMAIL}>`,
};
