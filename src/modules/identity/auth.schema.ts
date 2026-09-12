import { z } from "zod";
import {
  emailSchema,
  passwordSchema,
  registrationPasswordSchema,
  firstNameSchema,
  lastNameSchema,
  phoneSchema,
  organizationNameSchema,
  industrySchema,
  vendorNameSchema,
  companyRegistrationNumberSchema,
  addressSchema,
  passwordConfirmation,
} from "@/shared/validators/index.js";

const registerOrgBodySchema = passwordConfirmation(
  z.object({
    organizationName: organizationNameSchema,
    industry: industrySchema,
    email: emailSchema,
    phone: phoneSchema,
    address: addressSchema,
    firstName: firstNameSchema,
    lastName: lastNameSchema,
    password: registrationPasswordSchema,
    confirmPassword: passwordSchema,
  }),
  "password",
  "confirmPassword",
);

export const registerOrgSchema = z.object({
  body: registerOrgBodySchema,
});

export type RegisterOrgDto = z.infer<typeof registerOrgBodySchema>;

const registerVendorBodySchema = passwordConfirmation(
  z.object({
    vendorName: vendorNameSchema,
    email: emailSchema,
    phone: phoneSchema,
    address: addressSchema,
    companyRegistrationNumber: companyRegistrationNumberSchema.optional(),
    firstName: firstNameSchema,
    lastName: lastNameSchema,
    password: registrationPasswordSchema,
    confirmPassword: passwordSchema,
  }),
  "password",
  "confirmPassword",
);

export const registerVendorSchema = z.object({
  body: registerVendorBodySchema,
});

export type RegisterVendorDto = z.infer<typeof registerVendorBodySchema>;

/**
 *
 */
const oauthRegisterOrgDataSchema = z.object({
  organizationName: organizationNameSchema,
  industry: industrySchema,
  email: emailSchema,
  phone: phoneSchema,
  address: addressSchema,
  firstName: firstNameSchema,
  lastName: lastNameSchema,
});

export type OAuthRegisterOrgDto = z.infer<typeof oauthRegisterOrgDataSchema>;

export const oauthRegisterOrgDataParser = oauthRegisterOrgDataSchema;

const oauthRegisterVendorDataSchema = z.object({
  vendorName: vendorNameSchema,
  email: emailSchema,
  phone: phoneSchema,
  address: addressSchema,
  companyRegistrationNumber: companyRegistrationNumberSchema.optional(),
  firstName: firstNameSchema,
  lastName: lastNameSchema,
});

export type OAuthRegisterVendorDto = z.infer<
  typeof oauthRegisterVendorDataSchema
>;

export const oauthRegisterVendorDataParser = oauthRegisterVendorDataSchema;

const loginBodySchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  body: loginBodySchema,
});

export type LoginDto = z.infer<typeof loginBodySchema>;
