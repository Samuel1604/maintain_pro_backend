import { requestHandler } from "@/shared/utils/request.js";
import type { AuthRequest } from "@/shared/types/request.js";
import { vendorService } from "@/container/index.js";
import { updateVendorProfileSchema } from "./vendor.schema.js";

export const getVendor = requestHandler<AuthRequest>(async (req, res) => {
  const result = await vendorService.getVendor(req.user);

  return res.ok(result.data, result.message);
});

export const updateVendor = requestHandler<AuthRequest>(async (req, res) => {
  const data = updateVendorProfileSchema.parse(req.body);
  const result = await vendorService.updateVendor(data, req.user);

  return res.ok(result.data, result.message);
});

export const getVendorPerformance = requestHandler<AuthRequest>(async (req, res) => res.ok(await vendorService.performance(req.user), "Vendor performance retrieved"));
