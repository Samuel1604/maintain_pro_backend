import { VendorService } from "@/modules/vendors/vendor.service.js";
import { VendorRepository } from "@/modules/vendors/vendor.repository.js";
import { auditService } from "./audit.js";


const vendor = new VendorRepository();
export const vendorService = new VendorService(vendor, auditService);