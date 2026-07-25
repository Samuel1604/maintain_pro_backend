import { AppError } from "@/shared/errors/AppError.js";
import { ROLES } from "@/shared/constants/roles.js";
import { FacilityRepository } from "./facility.repository.js";
import type { CreateFacilityInput } from "./facility.schema.js";

type Actor = {
  userId: string;
  role: string;
};

const managerRoles: string[] = [ROLES.ADMIN, ROLES.FACILITY_MANAGER];

export class FacilityService {
  private repository = new FacilityRepository();

  create(data: CreateFacilityInput, actor: Actor) {
    if (!managerRoles.includes(actor.role)) {
      throw new AppError(
        "Only admin or facility manager can create facilities",
        403,
      );
    }

    return this.repository.create(data);
  }

  listByOrganization(organizationId: string) {
    return this.repository.findByOrganization(organizationId);
  }
}
