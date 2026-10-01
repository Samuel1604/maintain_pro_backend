import { describe, expect, it, vi } from "vitest";
import { ResendProvider } from "./resend.provider.js";

describe("ResendProvider", () => {
  it("requires an API key", () => {
    vi.stubEnv("RESEND_API_KEY", "");
    expect(() => new ResendProvider({})).toThrow("RESEND_API_KEY is not configured");
    vi.unstubAllEnvs();
  });

  it("maps the email abstraction payload to Resend", async () => {
    const send = vi.fn().mockResolvedValue({ data: { id: "re_123" }, error: null });
    const provider = new ResendProvider({
      apiKey: "test-key",
      defaultFromName: "MaintainPro",
      defaultFromEmail: "noreply@maintainpro.samueldev.cv",
      client: { emails: { send } },
    });

    const result = await provider.sendEmail({
      to: { email: "recipient@example.com", name: "Recipient" },
      subject: "Verify your email",
      html: "<p>123456</p>",
      correlationId: "corr-1",
    });

    expect(result).toEqual({
      messageId: "re_123",
      provider: "Resend",
      acceptedRecipients: ["recipient@example.com"],
    });
    expect(send).toHaveBeenCalledWith({
      from: "MaintainPro <noreply@maintainpro.samueldev.cv>",
      to: ["recipient@example.com"],
      subject: "Verify your email",
      html: "<p>123456</p>",
    });
  });

  it("maps provider failures without exposing the API key", async () => {
    const send = vi.fn().mockResolvedValue({
      data: null,
      error: { name: "rate_limit_exceeded", message: "temporarily unavailable", statusCode: 429 },
    });
    const provider = new ResendProvider({ apiKey: "test-key", client: { emails: { send } } });

    await expect(
      provider.sendEmail({ to: "recipient@example.com", subject: "Subject", text: "Body" }),
    ).rejects.toMatchObject({ code: "EMAIL_PROVIDER_UNAVAILABLE" });
  });
});
