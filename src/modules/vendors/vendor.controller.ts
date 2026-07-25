import { requestHandler } from "@/shared/utils/request.js";
import type { AuthRequest } from "@/shared/types/request.js";
import { vendorService } from "@/container/index.js";
import { updateVendorProfileSchema } from "./vendor.schema.js";

const service = vendorService;

export const getVendor = requestHandler<AuthRequest>(async (req, res) => {
  const vendor = await vendorService.getVendor(req.user);

  return res.status(200).json({
    success: true,
    data: vendor,
  });
});

export const updateVendor = requestHandler<AuthRequest>(async (req, res) => {
  const data = updateVendorProfileSchema.parse(req.body);
  const vendor = await vendorService.updateVendor(data, req.user);

  return res.status(200).json({
    success: true,
    data: vendor,
  });
});
