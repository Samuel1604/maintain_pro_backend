import { z } from "zod";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ObjectId");
const date = z.coerce.date();

export const reportQuerySchema = z.object({
  startDate: date,
  endDate: date,
  facilityId: objectId.optional(),
  locationId: objectId.optional(),
  assetId: objectId.optional(),
  status: z.string().trim().min(1).optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  serviceCategory: z.string().trim().min(1).optional(),
  technicianId: objectId.optional(),
  vendorId: objectId.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().optional(),
  sortBy: z.enum(["createdAt", "updatedAt", "priority", "status"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
}).refine((value) => value.endDate >= value.startDate, { message: "endDate must be on or after startDate", path: ["endDate"] });

export type ReportQuery = z.infer<typeof reportQuerySchema>;
