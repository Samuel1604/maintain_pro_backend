import type { IVendorApplication } from "./vendor-application.model.js";
import type { VendorApplicationResponse } from "./vendor-application.dto.js";
export function toVendorApplicationResponse(item: IVendorApplication): VendorApplicationResponse { return { id: item._id.toString(), organizationId: item.organizationId.toString(), workOrderId: item.workOrderId.toString(), vendorId: item.vendorId.toString(), appliedBy: item.appliedBy.toString(), note: item.note, status: item.status, createdAt: item.createdAt.toISOString(), updatedAt: item.updatedAt.toISOString() }; }
