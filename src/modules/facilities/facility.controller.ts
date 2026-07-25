import { requestHandler } from "@/shared/utils/request.js";
import type { AuthRequest } from "@/shared/types/request.js";
import { FacilityService } from "./facility.service.js";
import { createFacilitySchema } from "./facility.schema.js";

const service = new FacilityService();

export const createFacility = requestHandler<AuthRequest>(async (req, res) => {
  const data = createFacilitySchema.parse(req.body);
  const facility = await service.create(data, req.user);

  return res.status(201).json({
    success: true,
    data: facility,
  });
});

export const listFacilities = requestHandler<
  AuthRequest<{}, {}, { organizationId?: string }>
>(async (req, res) => {
  const facilities = await service.listByOrganization(
    req.query.organizationId ?? "",
  );

  return res.status(200).json({
    success: true,
    data: facilities,
  });
});
