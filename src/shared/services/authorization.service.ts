import { FacilityRepository } from "@/modules/facilities/facility.repository.js";
import {
  AuthorizationException,
  ValidationException,
  NotFoundException,
} from "@/shared/errors/index.js";
import { ROLES } from "@/shared/constants/roles.js";
import { isSameObjectId } from "@/shared/validators/index.js";
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
      throw new AuthorizationException("Access denied");
    }
  }

  requireOrganization(actor: JwtPayload) {
    if (!actor.organizationId) {
      throw new ValidationException("Organization context required");
    }

    return actor.organizationId;
  }

  requireFacility(actor: JwtPayload) {
    if (!actor.facilityId) {
      throw new ValidationException("Facility context required");
    }

    return actor.facilityId;
  }

  requireVendor(actor: JwtPayload) {
    if (!actor.vendorId) {
      throw new ValidationException("Vendor context required");
    }

    return actor.vendorId;
  }

  /**
   * Organization boundary check
   */
  verifyOrganizationAccess(actor: JwtPayload, organizationId: string) {
    if (!isSameObjectId(actor.organizationId, organizationId)) {
      throw new AuthorizationException("Organization access denied");
    }

    return true;
  }

  /**
   * Facility scope restriction
   */
  verifyFacilityScope(actor: JwtPayload, facilityId: string) {
    if (
      facilityScopedRoles.includes(actor.role) &&
      actor.facilityId &&
      !isSameObjectId(actor.facilityId, facilityId)
    ) {
      throw new AuthorizationException("You can only access your assigned facility");
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
      throw new NotFoundException("Facility not found");
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
