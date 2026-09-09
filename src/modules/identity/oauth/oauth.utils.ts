import jwt from "jsonwebtoken";
import { oauthConfig } from "@/config/oauth.config.js";
import type { OAuthState } from "./oauth.types.js";
import { RedisService } from "@/shared/services/redis.service.js";

const SECRET = oauthConfig.stateSecret;
const expiresIn = oauthConfig.stateExpiresIn;
const stateStore = new RedisService();
const stateTtlSeconds = 10 * 60;

export const createOAuthState = (payload: OAuthState) => {
  return jwt.sign(payload, SECRET, {
    expiresIn,
  });
};

export function verifyOAuthState(state: string): OAuthState {
  return jwt.verify(state, SECRET) as OAuthState;
}

export async function saveOAuthState(nonce: string, state: string): Promise<void> {
  await stateStore.set(`oauth:state:${nonce}`, state, stateTtlSeconds);
}

export async function consumeOAuthState(nonce: string, state: string): Promise<boolean> {
  const key = `oauth:state:${nonce}`;
  const stored = await stateStore.get(key);
  if (!stored || stored !== state) return false;
  await stateStore.delete(key);
  return true;
}
