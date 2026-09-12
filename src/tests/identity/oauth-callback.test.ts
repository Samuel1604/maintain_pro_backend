import { beforeEach, describe, expect, it, vi } from "vitest";
import { OAuthController } from "@/modules/identity/oauth/oauth.controller.js";
import { createOAuthState } from "@/modules/identity/oauth/oauth.utils.js";

describe("OAuth callback validation", () => {
  beforeEach(() => {
    process.env.REDIS_DISABLE_CONNECTION = "true";
    process.env.NODE_ENV = "test";
  });

  it("rejects a callback with the wrong browser nonce before provider exchange", async () => {
    const verify = vi.fn();
    const controller = new OAuthController(
      { verify } as never,
      {} as never,
    );
    const state = createOAuthState({ nonce: "expected-nonce", action: "login" });
    const next = vi.fn();

    await controller.oauthCallback(
      {
        params: { provider: "google" },
        query: { code: "provider-code", state },
        cookies: { oauthStateNonce: "different-nonce" },
      } as never,
      {} as never,
      next,
    );

    expect(verify).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledOnce();
    expect(next.mock.calls[0]?.[0]).toMatchObject({ statusCode: 400 });
  });
});
