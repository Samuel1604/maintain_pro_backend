import { requestHandler } from "@/shared/utils/request.js";
import type { AuthRequest } from "@/shared/types/request.js";
import { organizationService } from "@/container/index.js";

export const getOrganization = requestHandler<AuthRequest>(async (req, res) => {
  const organization = await organizationService.getOrganization(req.user);

  return res.status(200).json({
    success: true,
    data: organization,
  });
});
