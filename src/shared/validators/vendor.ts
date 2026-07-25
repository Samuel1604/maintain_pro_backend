import { z } from "zod";

export const vendorNameSchema = z
  .string()
  .trim()
  .min(2, "Vendor name must be at least 2 characters")
  .max(100, "Vendor name cannot exceed 100 characters");

export const companyRegistrationNumberSchema = z
  .string()
  .trim()
  .min(2, "Company registration number is invalid")
  .max(100, "Company registration number cannot exceed 100 characters")
  .optional();

export const vendorDescriptionSchema = z
  .string()
  .trim()
  .max(1000, "Description cannot exceed 1000 characters")
  .optional();

export const vendorWebsiteSchema = z.url("Invalid website URL").optional();

export const vendorLogoSchema = z.url("Invalid logo URL").optional();
