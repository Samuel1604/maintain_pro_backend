import { z } from "zod";
import {ROLES} from "../constants/roles.js"


export const emailSchema = z
  .email("Invalid email address")
  .trim()
  .toLowerCase();

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(100);

export const nameSchema = z.string().trim().min(2).max(50);

export const phoneSchema = z.string().trim().min(7).max(20);

export const addressSchema = z.string().trim().min(5).max(255);

export const latitudeSchema = z.number().min(-90).max(90);

export const longitudeSchema = z.number().min(-180).max(180);

export const coverageRadiusSchema = z.number().min(0);

export const serviceCategorySchema = z.string().trim().min(2);

export const certificationSchema = z.string().trim().min(2);

export const pageSchema = z.coerce.number().int().min(1).default(1);

export const limitSchema = z.coerce.number().int().min(1).max(100).default(20);

export const searchSchema = z.string().trim().min(1).optional();

export const roleSchema = z.enum(Object.values(ROLES)).optional()