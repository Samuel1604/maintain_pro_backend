import { env } from "./env.js";

export const mailConfig = {
  apiKey: env.RESEND_API_KEY,

  from: "MaintainPro <noreply@maintainpro.com>",
};
