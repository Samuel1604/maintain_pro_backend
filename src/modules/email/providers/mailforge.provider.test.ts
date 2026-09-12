import { describe, expect, it, vi } from "vitest";
import { MailforgeProvider } from "./mailforge.provider.js";

describe("MailforgeProvider", () => {
  it("maps the application payload and returns the delivery ID", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ deliveryId: "delivery_123" }), { status: 202 }));
    vi.stubGlobal("fetch", fetchMock);
    const provider = new MailforgeProvider({ baseUrl: "http://mailforge", accountId: "acct_1", apiKey: "secret" });

    const result = await provider.sendEmail({
      to: { email: "user@example.com", name: "User" },
      subject: "Work order updated",
      text: "Updated",
      correlationId: "corr-1",
      metadata: { eventId: "event-1" },
    });

    expect(result.messageId).toBe("delivery_123");
    expect(fetchMock).toHaveBeenCalledWith("http://mailforge/v1/accounts/acct_1/emails", expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({ Authorization: "Bearer secret" }),
      body: expect.stringContaining('"idempotencyKey":"event-1"'),
    }));
    vi.unstubAllGlobals();
  });

  it("classifies server failures as provider unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { code: "service_unavailable" } }), { status: 503 })));
    const provider = new MailforgeProvider({ baseUrl: "http://mailforge", accountId: "acct_1", apiKey: "secret" });
    await expect(provider.sendEmail({ to: "user@example.com", subject: "Subject", text: "Body" })).rejects.toMatchObject({ code: "EMAIL_PROVIDER_UNAVAILABLE" });
    vi.unstubAllGlobals();
  });
});
