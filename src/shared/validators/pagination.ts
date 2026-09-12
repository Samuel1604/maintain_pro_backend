import { z } from "zod";

export const pageSchema = z.coerce.number().int().min(1).default(1);

export const limitSchema = z.coerce.number().int().min(1).max(100).default(20);

export const searchSchema = z.string().trim().min(1).optional();
