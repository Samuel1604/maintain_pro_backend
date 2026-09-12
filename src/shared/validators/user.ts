import { z } from "zod";

export const nameSchema = z
  .string()
  .trim()
  .min(2, "Name must be at least 2 characters")
  .max(50, "Name cannot exceed 50 characters")
  .regex(/^[A-Za-zÀ-ÿ' -]+$/, "Name contains invalid characters");

export const phoneSchema = z
  .string()
  .trim()
  .min(7, "Phone number is too short")
  .max(20, "Phone number is too long")
  .regex(/^\+?[0-9\s()-]+$/, "Invalid phone number");

export const avatarSchema = z.url("Invalid avatar URL").optional();

export const bioSchema = z
  .string()
  .trim()
  .max(500, "Bio cannot exceed 500 characters")
  .optional();

export const firstNameSchema = nameSchema;
export const lastNameSchema = nameSchema;
