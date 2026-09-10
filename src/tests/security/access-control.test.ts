import { describe, expect, it } from "vitest";
import { AccessControlService } from "@/shared/services/authorization.service.js";
import { ROLES } from "@/shared/constants/roles.js";

const organizationId = "507f1f77bcf86cd799439011";
const otherOrganizationId = "507f1f77bcf86cd799439012";
const facilityId = "507f1f77bcf86cd799439021";
const otherFacilityId = "507f1f77bcf86cd799439022";
const vendorId = "507f1f77bcf86cd799439031";

const actor = (overrides: Record<string, unknown> = {}) => ({
  userId: "507f1f77bcf86cd799439041",
  role: ROLES.FACILITY_MANAGER,
  organizationId,
  facilityId,
  ...overrides,
});

describe("AccessControlService scope invariants", () => {
  const access = new AccessControlService();

  it("allows an actor to access its organization and assigned facility", () => {
    const currentActor = actor();

    expect(access.requireOrganization(currentActor)).toBe(organizationId);
    expect(access.requireFacility(currentActor)).toBe(facilityId);
    expect(access.verifyOrganizationAccess(currentActor, organizationId)).toBe(true);
    expect(access.verifyFacilityScope(currentActor, facilityId)).toBe(true);
  });

  it("rejects cross-organization and cross-facility access", () => {
    const currentActor = actor();

    expect(() => access.verifyOrganizationAccess(currentActor, otherOrganizationId)).toThrow(
      "Organization access denied",
    );
    expect(() => access.verifyFacilityScope(currentActor, otherFacilityId)).toThrow(
      "You can only access your assigned facility",
    );
  });

  it("requires the context needed by organization, facility, and vendor paths", () => {
    expect(() => access.requireOrganization(actor({ organizationId: undefined }))).toThrow(
      "Organization context required",
    );
    expect(() => access.requireFacility(actor({ facilityId: undefined }))).toThrow(
      "Facility context required",
    );
    expect(access.requireVendor(actor({ vendorId }))).toBe(vendorId);
    expect(() => access.requireVendor(actor({ vendorId: undefined }))).toThrow(
      "Vendor context required",
    );
  });

  it("does not impose facility scope on organization administrators", () => {
    const admin = actor({ role: ROLES.ADMIN, facilityId: undefined });

    expect(access.verifyOrganizationAccess(admin, organizationId)).toBe(true);
    expect(access.verifyFacilityScope(admin, otherFacilityId)).toBe(true);
  });
});
