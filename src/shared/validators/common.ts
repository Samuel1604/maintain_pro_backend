import { z } from "zod";
import { ROLES } from "../constants/roles.js";

export const addressSchema = z.object({
  street: z.string().trim().max(255).optional(),
  city: z.string().trim().max(100).optional(),
  state: z.string().trim().max(100).optional(),
  postalCode: z.string().trim().max(20).optional(),
  country: z.string().trim().max(100).optional(),
});

export const slugSchema = z
  .string()
  .trim()
  .min(1, "Slug is required")
  .max(100, "Slug cannot exceed 100 characters")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid slug");

export const urlSchema = z.url("Invalid URL");

export const latitudeSchema = z.number().min(-90).max(90);

export const longitudeSchema = z.number().min(-180).max(180);

export const coverageRadiusSchema = z.number().min(0);

export const serviceCategorySchema = z.string().trim().min(2);

export const certificationSchema = z.string().trim().min(2);

const roleTuple: [string, ...string[]] = [
  ROLES.ADMIN,
  ROLES.FACILITY_MANAGER,
  ROLES.TECHNICIAN,
  ROLES.VENDOR_LEAD,
  ROLES.VENDOR_MANAGER,
  ROLES.VENDOR_TECHNICIAN,
  ROLES.FINANCE,
  ROLES.STAFF,
];

export const roleSchema = z.enum(roleTuple);
