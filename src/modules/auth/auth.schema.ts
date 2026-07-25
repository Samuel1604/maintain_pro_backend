import { z } from "zod";
import { ORG_PLANS, VENDOR_PLANS } from "@/shared/constants/plans.js";
import {
  emailSchema,
  passwordSchema,
} from "@/shared/validators/auth.js";
import {
  firstNameSchema,
  lastNameSchema,
  phoneSchema,
} from "@/shared/validators/user.js";
import {
  organizationNameSchema,
  industrySchema,
} from "@/shared/validators/organization.js";
import {
  vendorNameSchema,
  companyRegistrationNumberSchema,
} from "@/shared/validators/vendor.js";
import { addressSchema } from "@/shared/validators/common.js";
import { passwordConfirmation } from "@/shared/validators/password.js";

export const registerOrgSchema = passwordConfirmation(z
  .object({
    organizationName: organizationNameSchema,

    industry: industrySchema,

    email: emailSchema,

    phone: phoneSchema,

    address: addressSchema,

    plan: z.enum(ORG_PLANS),

    firstName: firstNameSchema,

    lastName: lastNameSchema,

    password: passwordSchema,

    confirmPassword: passwordSchema,
  }),
   "password",
  "confirmPassword",
)

export type RegisterOrgDto = z.infer<typeof registerOrgSchema>;

export const registerVendorSchema = passwordConfirmation(z
  .object({
    vendorName: vendorNameSchema,

    email: emailSchema,

    phone: phoneSchema,

    address: addressSchema,

    companyRegistrationNumber: companyRegistrationNumberSchema.optional(),

    plan: z.enum(VENDOR_PLANS),

    firstName: firstNameSchema,

    lastName: lastNameSchema,

    password: passwordSchema,

    confirmPassword: passwordSchema,
  }),
   "password",
  "confirmPassword",)

export type RegisterVendorDto = z.infer<typeof registerVendorSchema>;

export const loginSchema = z.object({
  email: emailSchema,

  password: passwordSchema,
});

export type LoginDto = z.infer<typeof loginSchema>;
