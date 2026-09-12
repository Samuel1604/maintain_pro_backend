import slugify from "slugify";
import { Organization } from "@/modules/organizations/organization.model.js";
import { Vendor } from "@/modules/vendors/vendor.model.js";
async function unique(base: string, exists: (slug: string) => Promise<unknown>) { let slug = base || "portal"; let n = 2; while (await exists(slug)) slug = `${base}-${n++}`; return slug; }
const normal = (name: string) => slugify(name, { lower: true, strict: true, trim: true });
export const uniqueOrganizationSlug = (name: string) => unique(normal(name), (slug) => Organization.exists({ slug }));
export const uniqueVendorSlug = (name: string) => unique(normal(name), (slug) => Vendor.exists({ slug }));
