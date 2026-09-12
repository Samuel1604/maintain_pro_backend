import { afterEach, describe, expect, it } from "vitest";
import { consumeOAuthState, saveOAuthState } from "@/modules/identity/oauth/oauth.utils.js";

describe("OAuth state consumption", () => {
  afterEach(() => {
    process.env.REDIS_DISABLE_CONNECTION = "true";
    process.env.NODE_ENV = "test";
  });

  it("allows only one concurrent callback to consume a state", async () => {
    process.env.REDIS_DISABLE_CONNECTION = "true";
    const nonce = `nonce-${Date.now()}`;
    const state = "signed-state";
    await saveOAuthState(nonce, state);

    const results = await Promise.all([
      consumeOAuthState(nonce, state),
      consumeOAuthState(nonce, state),
    ]);

    expect(results.filter(Boolean)).toHaveLength(1);
    expect(results.filter((result) => !result)).toHaveLength(1);
  });

  it("rejects a callback carrying a different signed state for the same nonce", async () => {
    process.env.REDIS_DISABLE_CONNECTION = "true";
    const nonce = `nonce-${Date.now()}-mismatch`;
    await saveOAuthState(nonce, "state-from-browser-a");

    await expect(
      consumeOAuthState(nonce, "state-from-browser-b"),
    ).resolves.toBe(false);
    await expect(
      consumeOAuthState(nonce, "state-from-browser-a"),
    ).resolves.toBe(true);
  });
});
