import {
  loginSchema,
  registerOrgSchema,
  registerVendorSchema,
} from "../auth.schema.js";
import { z } from "zod";

export type RegisterOrgDto = z.infer<typeof registerOrgSchema>;

export type RegisterVendorDto = z.infer<typeof registerVendorSchema>;

export type LoginDto = z.infer<typeof loginSchema>;
