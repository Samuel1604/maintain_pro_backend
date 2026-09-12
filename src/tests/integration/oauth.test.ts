/**
 * OAuth Integration Tests
 *
 * Verifies that:
 * - Requesting OAuth redirection without an action defaults to "login"
 * - Returns 302 redirect with google/linkedin auth URL including the serialized state
 */
import { describe, expect, it } from "vitest";
import request from "supertest";
import { createTestApp } from "@/tests/helpers/app.js";
import { verifyOAuthState } from "@/modules/identity/oauth/oauth.utils.js";

describe("OAuth Flows", () => {
  it("defaults action to login and redirects to google auth url", async () => {
    const app = await createTestApp();
    const res = await request(app).get("/api/v1/auth/oauth/google");

    expect(res.status).toBe(302);
    const location = res.headers.location as string;
    expect(location).toContain("accounts.google.com");

    const url = new URL(location);
    const stateParam = url.searchParams.get("state");
    expect(stateParam).toBeDefined();

    const decoded = verifyOAuthState(stateParam!);
    expect(decoded.action).toBe("login");
  });

  it("defaults action to login and redirects to linkedin auth url", async () => {
    const app = await createTestApp();
    const res = await request(app).get("/api/v1/auth/oauth/linkedin");

    expect(res.status).toBe(302);
    const location = res.headers.location as string;
    expect(location).toContain("linkedin.com");

    const url = new URL(location);
    const stateParam = url.searchParams.get("state");
    expect(stateParam).toBeDefined();

    const decoded = verifyOAuthState(stateParam!);
    expect(decoded.action).toBe("login");
  });
});
