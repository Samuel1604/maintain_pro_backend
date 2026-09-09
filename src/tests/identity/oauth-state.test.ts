import { describe, expect, it } from "vitest";
import { createOAuthState, consumeOAuthState, saveOAuthState } from "@/modules/identity/oauth/oauth.utils.js";

describe("OAuth state", () => {
  it("accepts a state once and rejects replay", async () => {
    const nonce = `test-${crypto.randomUUID()}`;
    const state = createOAuthState({ nonce, action: "login" });

    await saveOAuthState(nonce, state);

    await expect(consumeOAuthState(nonce, state)).resolves.toBe(true);
    await expect(consumeOAuthState(nonce, state)).resolves.toBe(false);
  });

  it("rejects a state that does not match the stored value", async () => {
    const nonce = `test-${crypto.randomUUID()}`;
    const storedState = createOAuthState({ nonce, action: "login" });
    const differentState = `${storedState}tampered`;

    await saveOAuthState(nonce, storedState);

    await expect(consumeOAuthState(nonce, differentState)).resolves.toBe(false);
    await expect(consumeOAuthState(nonce, storedState)).resolves.toBe(true);
  });
});
