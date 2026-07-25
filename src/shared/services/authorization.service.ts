import { FacilityRepository } from "@/modules/facilities/facility.repository.js";
import { AppError } from "@/shared/errors/AppError.js";
import { ROLES } from "@/shared/constants/roles.js";
import { sameId } from "@/shared/validators/objectId.js";
import type { JwtPayload } from "@/shared/types/jwt.types.js";
import type { IAsset } from "@/modules/assets/asset.model.js";

const facilityScopedRoles: string[] = [
  ROLES.FACILITY_MANAGER,
  ROLES.TECHNICIAN,
  ROLES.STAFF,
];

export class AccessControlService {
  private facilityRepository = new FacilityRepository();

  /**
   * Generic role guard
   */
  requireRoles(actor: JwtPayload, roles: string[]) {
    if (!roles.includes(actor.role)) {
      throw new AppError("Access denied", 403);
    }
  }

  requireOrganization(actor: JwtPayload) {
    if (!actor.organizationId) {
      throw new AppError("Organization context required", 400);
    }

    return actor.organizationId;
  }

  requireFacility(actor: JwtPayload) {
    if (!actor.facilityId) {
      throw new AppError("Facility context required", 400);
    }

    return actor.facilityId;
  }

  requireVendor(actor: JwtPayload) {
    if (!actor.vendorId) {
      throw new AppError("Vendor context required", 400);
    }

    return actor.vendorId;
  }

  /**
   * Organization boundary check
   */
  verifyOrganizationAccess(actor: JwtPayload, organizationId: string) {
    if (!sameId(actor.organizationId, organizationId)) {
      throw new AppError("Organization access denied", 403);
    }

    return true;
  }

  /**
   * Facility scope restriction
   *
   * Admin:
   *   Can access any facility in organization
   *
   * Facility Manager:
   *   Only assigned facility
   *
   * Technician:
   *   Only assigned facility
   *
   * Staff:
   *   Only assigned facility
   */
  verifyFacilityScope(actor: JwtPayload, facilityId: string) {
    if (
      facilityScopedRoles.includes(actor.role) &&
      actor.facilityId &&
      !sameId(actor.facilityId, facilityId)
    ) {
      throw new AppError("You can only access your assigned facility", 403);
    }

    return true;
  }

  /**
   * Verify facility exists
   * Verify facility belongs to actor organization
   * Verify facility scope restrictions
   */
  async verifyFacilityAccess(actor: JwtPayload, facilityId: string) {
    const facility = await this.facilityRepository.findById(facilityId);

    if (!facility) {
      throw new AppError("Facility not found", 404);
    }

    this.verifyOrganizationAccess(actor, facility.organizationId.toString());

    this.verifyFacilityScope(actor, facilityId);

    return facility;
  }

  /**
   * Asset access verification
   */
  verifyAssetAccess(actor: JwtPayload, asset: IAsset) {
    this.verifyOrganizationAccess(actor, asset.organizationId.toString());

    this.verifyFacilityScope(actor, asset.facilityId.toString());

    return asset;
  }

  /**
   * Convenience helper
   */
  isAdmin(actor: JwtPayload) {
    return actor.role === ROLES.ADMIN;
  }

  /**
   * Convenience helper
   */
  isFacilityManager(actor: JwtPayload) {
    return actor.role === ROLES.FACILITY_MANAGER;
  }

  /**
   * Convenience helper
   */
  isTechnician(actor: JwtPayload) {
    return actor.role === ROLES.TECHNICIAN;
  }
}
