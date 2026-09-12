import { describe, it, expect, vi } from "vitest";
import { AppContainer } from "@/container/app.container.js";
import { UserFactory } from "@/tests/factories/user.factory.js";
import { AuthenticationException, NotFoundException } from "@/shared/errors/index.js";
import { SecurityAlertRaisedEvent } from "@/modules/identity/events/index.js";

const sessionMeta = { ipAddress: "127.0.0.1", userAgent: "vitest-agent" };

async function loginUser(container: AppContainer) {
  const { user, rawPassword } = await UserFactory.create();

  const result = await container.authService.login(
    { email: user.email, password: rawPassword },
    sessionMeta,
  );

  if (!result.data) {
    throw new Error("Login did not return auth data");
  }

  const { user: _authenticatedUser, ...rest } = result.data;

  return { user, ...rest };
}

describe("SessionService.refresh", () => {
  /**
   * Regression test for: rotateToken() created the rotated session document
   * without `sessionId`, which is `required: true` on the RefreshToken
   * model. Every refresh call threw a Mongoose ValidationError instead of
   * returning new tokens.
   */
  it("rotates the refresh token and returns a usable new token pair", async () => {
    const container = new AppContainer();
    const { refreshToken, sessionId } = await loginUser(container);

    const refreshed = await container.sessionService.refresh(refreshToken, {
      ...sessionMeta,
      sessionId,
    });

    expect(refreshed.accessToken).toBeTruthy();
    expect(refreshed.refreshToken).toBeTruthy();
    expect(refreshed.refreshToken).not.toBe(refreshToken);
  });

  it("preserves the logical session identity across rotation", async () => {
    const container = new AppContainer();
    const { user, refreshToken, sessionId } = await loginUser(container);

    await container.sessionService.refresh(refreshToken, {
      ...sessionMeta,
      sessionId,
    });

    const sessions = await container.sessionService.getSessions(
      user._id.toString(),
      { ...sessionMeta, sessionId },
    );

    // The rotated token is a new DB row, but it should still be the same
    // logical session the user sees in their device list — not a second,
    // orphaned entry with a different id.
    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.id).toBe(sessionId);
    expect(sessions[0]?.current).toBe(true);
  });

  it("allows the rotated (new) refresh token to be used for a further refresh", async () => {
    const container = new AppContainer();
    const { refreshToken, sessionId } = await loginUser(container);

    const firstRefresh = await container.sessionService.refresh(refreshToken, {
      ...sessionMeta,
      sessionId,
    });

    const secondRefresh = await container.sessionService.refresh(
      firstRefresh.refreshToken,
      { ...sessionMeta, sessionId },
    );

    expect(secondRefresh.accessToken).toBeTruthy();
    expect(secondRefresh.refreshToken).not.toBe(firstRefresh.refreshToken);
  });

  it("rejects reuse of an already-rotated (stale) refresh token", async () => {
    const container = new AppContainer();
    const { refreshToken, sessionId } = await loginUser(container);

    await container.sessionService.refresh(refreshToken, {
      ...sessionMeta,
      sessionId,
    });

    // Reusing the original (now-rotated-away) token is a token-theft signal.
    await expect(
      container.sessionService.refresh(refreshToken, {
        ...sessionMeta,
        sessionId,
      }),
    ).rejects.toBeInstanceOf(AuthenticationException);
  });

  it("rejects refresh with a revoked (logged-out) token", async () => {
    const container = new AppContainer();
    const { refreshToken, sessionId } = await loginUser(container);

    await container.sessionService.logout(refreshToken, {
      ...sessionMeta,
      sessionId,
    });

    await expect(
      container.sessionService.refresh(refreshToken, {
        ...sessionMeta,
        sessionId,
      }),
    ).rejects.toBeInstanceOf(AuthenticationException);
  });

  /**
   * Reuse of a stale (already-rotated) token is a token-theft signal, and
   * the correct response is to revoke the *entire* token family — not just
   * reject the stale token itself. Otherwise an attacker who stole the
   * original token gains nothing by trying it (it's already rejected
   * either way), but the legitimate user's *currently valid, rotated*
   * token would keep working, silently defeating the point of reuse
   * detection. This test proves the legitimate sibling token is also
   * killed, and that a security alert is raised.
   */
  it("revokes the entire token family (including the currently-valid rotated token) on reuse detection, and raises a security alert", async () => {
    const container = new AppContainer();
    const { refreshToken: originalToken, sessionId } = await loginUser(container);

    // Legitimate rotation: original -> rotated. `rotatedToken` is now the
    // one genuinely valid token for this session.
    const { refreshToken: rotatedToken } = await container.sessionService.refresh(
      originalToken,
      { ...sessionMeta, sessionId },
    );

    const publishSpy = vi.spyOn(container.eventBus, "publish");

    // Attacker (or anyone) replays the stale original token.
    await expect(
      container.sessionService.refresh(originalToken, {
        ...sessionMeta,
        sessionId,
      }),
    ).rejects.toBeInstanceOf(AuthenticationException);

    const alertCall = publishSpy.mock.calls.find(
      ([event]) => event instanceof SecurityAlertRaisedEvent,
    );
    expect(alertCall).toBeDefined();

    // The legitimate, currently-valid rotated token must now ALSO be
    // rejected — the whole family was revoked, not just the stale token.
    await expect(
      container.sessionService.refresh(rotatedToken, {
        ...sessionMeta,
        sessionId,
      }),
    ).rejects.toBeInstanceOf(AuthenticationException);
  });
});

describe("SessionService.logoutAll", () => {
  it("revokes every active session for the user, invalidating all of their refresh tokens", async () => {
    const container = new AppContainer();
    const { user, rawPassword } = await UserFactory.create();

    const login1 = await container.authService.login(
      { email: user.email, password: rawPassword },
      { ipAddress: "127.0.0.1", userAgent: "device-a" },
    );
    const login2 = await container.authService.login(
      { email: user.email, password: rawPassword },
      { ipAddress: "127.0.0.1", userAgent: "device-b" },
    );

    if (!login1.data || !login2.data) {
      throw new Error("Login did not return auth data");
    }

    await container.sessionService.logoutAll(user._id.toString());

    await expect(
      container.sessionService.refresh(login1.data.refreshToken, {
        ipAddress: "127.0.0.1",
        userAgent: "device-a",
        sessionId: login1.data.sessionId,
      }),
    ).rejects.toBeInstanceOf(AuthenticationException);

    await expect(
      container.sessionService.refresh(login2.data.refreshToken, {
        ipAddress: "127.0.0.1",
        userAgent: "device-b",
        sessionId: login2.data.sessionId,
      }),
    ).rejects.toBeInstanceOf(AuthenticationException);
  });
});

describe("SessionService.revokeSession", () => {
  /**
   * Regression test for: GET /sessions returns each session's public UUID
   * `sessionId` as `id`, but the revoke endpoint validated that `id` as a
   * Mongo ObjectId and looked it up by Mongo `_id` — so revoking a session
   * using the id the API itself returned always failed.
   */
  it("revokes a session using the id returned by getSessions", async () => {
    const container = new AppContainer();
    const { user, refreshToken, sessionId } = await loginUser(container);

    const sessions = await container.sessionService.getSessions(
      user._id.toString(),
      { ...sessionMeta, sessionId },
    );

    expect(sessions).toHaveLength(1);
    const listedId = sessions[0]!.id;

    await container.sessionService.revokeSession(user._id.toString(), listedId);

    // The revoked session must no longer support a refresh.
    await expect(
      container.sessionService.refresh(refreshToken, {
        ...sessionMeta,
        sessionId,
      }),
    ).rejects.toBeInstanceOf(AuthenticationException);
  });

  it("rejects revoking another user's session", async () => {
    const container = new AppContainer();
    const { user: ownerUser, sessionId } = await loginUser(container);
    const { user: otherUser } = await loginUser(container);

    const sessions = await container.sessionService.getSessions(
      ownerUser._id.toString(),
      { ...sessionMeta, sessionId },
    );
    const listedId = sessions[0]!.id;

    await expect(
      container.sessionService.revokeSession(otherUser._id.toString(), listedId),
    ).rejects.toThrow();
  });

  it("throws NotFoundException for an unknown session id", async () => {
    const container = new AppContainer();
    const { user } = await loginUser(container);

    await expect(
      container.sessionService.revokeSession(user._id.toString(), "does-not-exist"),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
