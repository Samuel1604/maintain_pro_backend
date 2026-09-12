import { requestHandler } from "@/shared/utils/request.js";
import type { AuthRequest } from "@/shared/types/request.js";
import { organizationService } from "@/container/index.js";
import { updateOrganizationSchema } from "./organization.schema.js";
import { AuthorizationException, NotFoundException } from "@/shared/errors/index.js";

export const getOrganization = requestHandler<AuthRequest>(async (req, res) => {
  const result = await organizationService.getOrganization(req.user);

  return res.ok(result.data, result.message);
});

export const updateOrganization = requestHandler<AuthRequest>(async (req, res) => {
  if (!req.user.organizationId) {
    throw new AuthorizationException("Organization context required");
  }

  const { body } = updateOrganizationSchema.parse({ body: req.body });
  const organization = await organizationService.update(req.user.organizationId, body);

  if (!organization) {
    throw new NotFoundException("Organization not found");
  }

  return res.ok(organization, "Organization profile updated successfully");
});
