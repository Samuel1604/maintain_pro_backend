import { Types } from "mongoose";
import { OrganizationVendorRelationship } from "./organization-vendor.model.js";
import { FacilityVendor } from "./facility-vendor.model.js";
export class VendorRelationshipRepository {
  list(
    organizationId: string,
    filter: Record<string, unknown>,
    skip: number,
    limit: number,
  ) {
    return OrganizationVendorRelationship.find({
      organizationId: new Types.ObjectId(organizationId),
      ...filter,
    })
      .populate("vendorId")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
  }
  count(organizationId: string, filter: Record<string, unknown>) {
    return OrganizationVendorRelationship.countDocuments({
      organizationId: new Types.ObjectId(organizationId),
      ...filter,
    });
  }
  find(organizationId: string, vendorId: string) {
    return OrganizationVendorRelationship.findOne({ organizationId, vendorId });
  }
  findByVendor(vendorId: string, organizationId?: string) {
    return OrganizationVendorRelationship.find({ vendorId, ...(organizationId ? { organizationId } : {}) }).sort({ createdAt: -1 }).limit(100);
  }
  create(data: Record<string, unknown>) {
    return OrganizationVendorRelationship.create(data);
  }
  update(
    organizationId: string,
    vendorId: string,
    data: Record<string, unknown>,
  ) {
    return OrganizationVendorRelationship.findOneAndUpdate(
      { organizationId, vendorId },
      data,
      { new: true },
    ).populate("vendorId");
  }
  facilityVendors(organizationId: string, facilityId: string) {
    return FacilityVendor.find({ organizationId, facilityId })
      .populate("vendorId")
      .sort({ createdAt: -1 });
  }
  vendorFacilities(organizationId: string, vendorId: string) {
    return FacilityVendor.find({ organizationId, vendorId })
      .populate("facilityId")
      .sort({ createdAt: -1 });
  }
  associate(data: Record<string, unknown>) {
    return FacilityVendor.create(data);
  }
  remove(organizationId: string, facilityId: string, vendorId: string) {
    return FacilityVendor.findOneAndDelete({
      organizationId,
      facilityId,
      vendorId,
    });
  }
}
