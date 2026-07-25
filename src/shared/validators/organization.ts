import { z } from "zod";

export const organizationNameSchema = z
  .string()
  .trim()
  .min(2, "Organization name must be at least 2 characters")
  .max(100, "Organization name cannot exceed 100 characters");

export const industrySchema = z
  .string()
  .trim()
  .min(2, "Industry is required")
  .max(100, "Industry cannot exceed 100 characters");

export const organizationDescriptionSchema = z
  .string()
  .trim()
  .max(1000, "Description cannot exceed 1000 characters")
  .optional();

export const organizationWebsiteSchema = z
  .url("Invalid website URL")
  .optional();

export const organizationLogoSchema = z.url("Invalid logo URL").optional();