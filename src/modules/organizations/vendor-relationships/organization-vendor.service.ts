import { Types } from "mongoose";
import {
  AuthorizationException,
  ConflictException,
  NotFoundException,
} from "@/shared/errors/index.js";
import { ROLES } from "@/shared/constants/roles.js";
import type { UserRole } from "@/shared/constants/roles.js";
import { Vendor } from "@/modules/vendors/vendor.model.js";
import { Facility } from "@/modules/facilities/facility.model.js";
import { VendorRelationshipRepository } from "./vendor-relationship.repository.js";
import type {
  VendorListInput,
  VendorStatusInput,
} from "./organization-vendor.schema.js";
import {
  toOrganizationVendorResponse,
  toVendorRelationshipResponse,
} from "./organization-vendor.mapper.js";
import { vendorMapper } from "@/modules/vendors/dto/vendor.mapper.js";
import { WorkOrder } from "@/modules/work-orders/work-order.model.js";
import { VendorSettings } from "@/modules/settings/settings.model.js";
type Actor = {
  userId: string;
  role: UserRole;
  organizationId?: string;
  vendorId?: string;
};
const managers = [ROLES.ADMIN, ROLES.FACILITY_MANAGER];
export class OrganizationVendorService {
  private relationships = new VendorRelationshipRepository();
  private org(actor: Actor) {
    if (!actor.organizationId)
      throw new AuthorizationException("Organization context required");
    return actor.organizationId;
  }
  private manage(actor: Actor) {
    if (!managers.includes(actor.role as typeof managers[number]))
      throw new AuthorizationException(
        "Only admin or facility manager can manage organization vendors",
      );
  }
  async list(actor: Actor, input: VendorListInput) {
    const organizationId = this.org(actor);
    const filter: Record<string, unknown> = {};
    if (input.status) filter.status = input.status;
    if (input.search || input.serviceCategory) {
      const vendorFilter: Record<string, unknown> = {};
      if (input.search)
        vendorFilter.name = { $regex: input.search, $options: "i" };
      if (input.serviceCategory)
        vendorFilter.serviceCategories = input.serviceCategory;
      const vendorIds = await Vendor.find(vendorFilter).distinct("_id");
      filter.vendorId = { $in: vendorIds };
    }
    const [items, total] = await Promise.all([
      this.relationships.list(
        organizationId,
        filter,
        (input.page - 1) * input.limit,
        input.limit,
      ),
      this.relationships.count(organizationId, filter),
    ]);
    return {
      success: true,
      message: "Organization vendors retrieved successfully",
      data: {
        data: items.map((item) => toOrganizationVendorResponse(item)),
        pagination: {
          page: input.page,
          limit: input.limit,
          total,
          pages: Math.ceil(total / input.limit),
        },
      },
    };
  }
  async marketplace(actor: Actor, input: VendorListInput) {
    this.org(actor);
    const hiddenVendorIds = await VendorSettings.find({
      $or: [{ marketplaceAvailable: false }, { profileVisible: false }],
    }).distinct("vendorId");
    const filter: Record<string, unknown> = {
      status: "active",
      _id: { $nin: hiddenVendorIds },
    };
    if (input.search) filter.name = { $regex: input.search, $options: "i" };
    if (input.serviceCategory) filter.serviceCategories = input.serviceCategory;
    const sort: Record<string, 1 | -1> = input.sort === "name"
      ? { name: 1 }
      : input.sort === "-name"
        ? { name: -1 }
        : input.sort === "createdAt"
          ? { createdAt: 1 }
          : { createdAt: -1 };
    const [vendors, total] = await Promise.all([
      Vendor.find(filter).sort(sort).skip((input.page - 1) * input.limit).limit(input.limit),
      Vendor.countDocuments(filter),
    ]);
    return {
      success: true,
      message: "Marketplace vendors retrieved successfully",
      data: {
        data: vendors.map((vendor) => vendorMapper.toVendorProfile(vendor)),
        pagination: {
          page: input.page,
          limit: input.limit,
          total,
          pages: Math.ceil(total / input.limit),
        },
      },
    };
  }
  async requestRelationship(vendorId: string, actor: Actor) {
    this.manage(actor);
    const organizationId = this.org(actor);
    const vendor = await Vendor.findById(vendorId);
    if (!vendor || vendor.status !== "active") throw new NotFoundException("Marketplace vendor not found");
    const existing = await this.relationships.find(organizationId, vendorId);
    if (existing && existing.status !== "removed") throw new ConflictException("A relationship with this vendor already exists");
    const relation = existing ? await this.relationships.update(organizationId, vendorId, { status: "pending", removedBy: undefined, removedAt: undefined }) : await this.relationships.create({ organizationId: new Types.ObjectId(organizationId), vendorId: new Types.ObjectId(vendorId), status: "pending", createdBy: new Types.ObjectId(actor.userId) });
    return { success: true, message: "Vendor relationship request submitted", data: toVendorRelationshipResponse(relation!) };
  }
  async get(vendorId: string, actor: Actor) {
    const organizationId = this.org(actor);
    const relation = await this.relationships.find(organizationId, vendorId);
    if (!relation || relation.status === "removed")
      throw new NotFoundException("Vendor not found");
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) throw new NotFoundException("Vendor not found");
    return {
      success: true,
      message: "Vendor retrieved successfully",
      data: toOrganizationVendorResponse(relation, vendor),
    };
  }
  async changeStatus(vendorId: string, input: VendorStatusInput, actor: Actor) {
    this.manage(actor);
    const organizationId = this.org(actor);
    const relation = await this.relationships.find(organizationId, vendorId);
    if (!relation) throw new NotFoundException("Vendor relationship not found");
    const now = new Date();
    const update: Record<string, unknown> = { status: input.status };
    if (input.status === "active") throw new AuthorizationException("Vendor relationships must be accepted by the Vendor tenant");
    if (input.status === "suspended") {
      update.suspendedBy = actor.userId;
      update.suspendedAt = now;
    }
    if (input.status === "removed") {
      update.removedBy = actor.userId;
      update.removedAt = now;
    }
    const result = await this.relationships.update(
      organizationId,
      vendorId,
      update,
    );
    return {
      success: true,
      message: "Vendor relationship status updated",
      data: toVendorRelationshipResponse(result!),
    };
  }
  async respondToRelationship(organizationId: string, input: VendorStatusInput, actor: Actor) { if (!actor.vendorId || ![ROLES.VENDOR_LEAD, ROLES.VENDOR_MANAGER].includes(actor.role as "vendor_lead" | "vendor_manager")) throw new AuthorizationException("Only vendor lead or vendor manager can respond to relationships"); if (!["active", "suspended", "inactive", "removed"].includes(input.status)) throw new AuthorizationException("Invalid vendor relationship response"); const relation = await this.relationships.find(organizationId, actor.vendorId); if (!relation) throw new NotFoundException("Vendor relationship not found"); const update: Record<string, unknown> = { status: input.status }; if (input.status === "active") { update.activatedBy = actor.userId; update.activatedAt = new Date(); } if (input.status === "removed") { update.removedBy = actor.userId; update.removedAt = new Date(); } const result = await this.relationships.update(organizationId, actor.vendorId, update); return { success: true, message: "Vendor relationship response recorded", data: toVendorRelationshipResponse(result!) }; }
  async facilityVendors(facilityId: string, actor: Actor) {
    const organizationId = this.org(actor);
    const facility = await Facility.findOne({
      _id: facilityId,
      organizationId,
    });
    if (!facility) throw new NotFoundException("Facility not found");
    const items = await this.relationships.facilityVendors(
      organizationId,
      facilityId,
    );
    return {
      success: true,
      message: "Facility vendors retrieved successfully",
      data: items,
    };
  }
  async associate(facilityId: string, vendorId: string, actor: Actor) {
    this.manage(actor);
    const organizationId = this.org(actor);
    const facility = await Facility.findOne({
      _id: facilityId,
      organizationId,
    });
    const relation = await this.relationships.find(organizationId, vendorId);
    if (!facility || !relation || relation.status !== "active")
      throw new AuthorizationException(
        "Facility and active vendor relationship must belong to this organization",
      );
    try {
      const item = await this.relationships.associate({
        organizationId,
        facilityId,
        vendorId,
        createdBy: actor.userId,
      });
      return {
        success: true,
        message: "Vendor associated with facility",
        data: item,
      };
    } catch {
      throw new ConflictException(
        "Vendor is already associated with this facility",
      );
    }
  }
  async removeAssociation(facilityId: string, vendorId: string, actor: Actor) {
    this.manage(actor);
    const organizationId = this.org(actor);
    const item = await this.relationships.remove(
      organizationId,
      facilityId,
      vendorId,
    );
    if (!item)
      throw new NotFoundException("Facility vendor association not found");
    return {
      success: true,
      message: "Vendor removed from facility",
      data: true,
    };
  }
  async performance(vendorId: string, actor: Actor) {
    const organizationId = this.org(actor);
    const relation = await this.relationships.find(organizationId, vendorId);
    if (!relation) throw new NotFoundException("Vendor relationship not found");
    const filter = { organizationId, assignedVendorId: vendorId };
    const [total, completed, inProgress, assigned] = await Promise.all([
      WorkOrder.countDocuments(filter), WorkOrder.countDocuments({ ...filter, status: "completed" }),
      WorkOrder.countDocuments({ ...filter, status: "in_progress" }), WorkOrder.countDocuments({ ...filter, status: "assigned" }),
    ]);
    return { data: { total, completed, inProgress, assigned, completionRate: total ? Math.round((completed / total) * 100) : 0 } };
  }
}
