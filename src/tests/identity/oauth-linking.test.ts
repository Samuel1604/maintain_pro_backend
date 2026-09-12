import { describe, expect, it, vi } from "vitest";
import { UserService } from "@/modules/users/user.service.js";

describe("OAuth provider linking", () => {
  it("refuses to link a provider identity already owned by another user", async () => {
    const emailUser = {
      _id: { toString: () => "email-user" },
    };
    const providerUser = {
      _id: { toString: () => "provider-user" },
    };
    const repository = {
      findByEmail: vi.fn().mockResolvedValue(emailUser),
      findByProviderId: vi.fn().mockResolvedValue(providerUser),
      update: vi.fn(),
    };

    const service = new UserService(
      repository as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    const result = await service.findAndLinkProvider(
      "person@example.com",
      "google",
      "provider-account-1",
    );

    expect(result).toBeNull();
    expect(repository.update).not.toHaveBeenCalled();
  });
});
