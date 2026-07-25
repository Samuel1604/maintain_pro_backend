import jwt from "jsonwebtoken";
import { oauthConfig } from "@/config/oauth.config.js";
import type { OAuthState } from "./oauth.types.js";

const SECRET = oauthConfig.stateSecret;
const expiresIn = oauthConfig.stateExpiresIn;

export const createOAuthState = (payload: OAuthState) => {
  return jwt.sign(payload, SECRET, {
    expiresIn,
  });
};

export function verifyOAuthState(state: string): OAuthState {
  return jwt.verify(state, SECRET) as OAuthState;
}
