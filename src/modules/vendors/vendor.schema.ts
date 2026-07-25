import { z } from "zod";
import { objectIdSchema } from "@/shared/validators/objectId.js";
import { serviceCategorySchema, coverageRadiusSchema, latitudeSchema, longitudeSchema, certificationSchema, addressSchema } from "@/shared/validators/common.js";
import { phoneSchema } from "@/shared/validators/user.js";
import { vendorNameSchema, companyRegistrationNumberSchema, vendorDescriptionSchema, vendorWebsiteSchema, vendorLogoSchema } from "@/shared/validators/vendor.js";


export const updateVendorSchema = z.object({
  vendorName: vendorNameSchema.optional(),

  phone: phoneSchema.optional(),

  address: addressSchema.optional(),

  companyRegistrationNumber: companyRegistrationNumberSchema,

  description: vendorDescriptionSchema,

  website: vendorWebsiteSchema,

  logo: vendorLogoSchema,
});

export type UpdateVendorDto = z.infer<typeof updateVendorSchema>;

export const vendorIdParamsSchema = z.object({
  id: objectIdSchema,
});

export type VendorIdParamsDto = z.infer<typeof vendorIdParamsSchema>;

export const listVendorsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),

  limit: z.coerce.number().int().min(1).max(100).default(20),

  search: z.string().trim().optional(),
});

export type ListVendorsQueryDto = z.infer<typeof listVendorsQuerySchema>;


export const updateVendorProfileSchema = z.object({
  serviceCategories: z
    .array(serviceCategorySchema)
    .optional(),

  serviceAreas: z
    .array(objectIdSchema)
    .optional(),

  coverageRadiusKm:
    coverageRadiusSchema.optional(),

  latitude:
    latitudeSchema.optional(),

  longitude:
    longitudeSchema.optional(),

  certifications: z
    .array(certificationSchema)
    .optional(),
});

export type UpdateVendorProfileInput = z.infer<
  typeof updateVendorProfileSchema
>;
