import { describe, expect, it, vi } from "vitest";
import { ConsoleLogger } from "@/infrastructure/logging/console.logger.js";

describe("ConsoleLogger", () => {
  it("emits structured records and redacts sensitive metadata", () => {
    const output = vi.spyOn(console, "info").mockImplementation(() => undefined);

    new ConsoleLogger().info("request completed", {
      requestId: "req-1",
      userId: "user-1",
      accessToken: "do-not-log",
      nested: { cardNumber: "4111111111111111" },
    });

    const record = JSON.parse(String(output.mock.calls[0]?.[0])) as {
      level: string;
      message: string;
      metadata: { accessToken: string; nested: { cardNumber: string } };
    };

    expect(record.level).toBe("info");
    expect(record.message).toBe("request completed");
    expect(record.metadata.accessToken).toBe("[REDACTED]");
    expect(record.metadata.nested.cardNumber).toBe("[REDACTED]");
    output.mockRestore();
  });
});
