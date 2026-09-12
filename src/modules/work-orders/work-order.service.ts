import mongoose, { Types } from "mongoose";
import {
  AuthorizationException,
  NotFoundException,
  BusinessException,
  ValidationException,
  InternalServerException,
} from "@/shared/errors/index.js";
import { ROLES } from "@/shared/constants/roles.js";
import {
  FULFILLMENT_TYPE,
  WORK_ORDER_STATUS,
} from "@/shared/constants/work-order-status.js";
import { User } from "@/modules/users/user.model.js";
import { Vendor } from "@/modules/vendors/vendor.model.js";
import { Facility } from "@/modules/facilities/facility.model.js";
import { Location } from "@/modules/locations/location.model.js";
import { Asset } from "@/modules/assets/asset.model.js";
import { OrganizationVendorRelationship } from "@/modules/organizations/vendor-relationships/organization-vendor.model.js";
import { FacilityVendor } from "@/modules/organizations/vendor-relationships/facility-vendor.model.js";
import { MarketplaceGeographicPolicy } from "@/modules/organizations/marketplace-geographic-policy.model.js";
import { distanceInKilometers } from "@/shared/utils/geography.js";
import type {
  CreateWorkOrderInput,
  RejectCompletionInput,
  RequestInformationInput,
  UpdateProgressInput,
  UpdateWorkOrderInput,
  AssignWorkOrderInput,
} from "./work-order.schema.js";
import { WorkOrderRepository } from "./work-order.repository.js";
import type { ApplicationResult } from "@/shared/application-result/index.js";
import { WorkOrder } from "./work-order.model.js";
import type { IWorkOrder } from "./work-order.model.js";

import { isSameObjectId, toObjectId } from "@/shared/validators/index.js";
import { BusinessFactEvent } from "@/infrastructure/events/business-fact.event.js";
import { RedisCache } from "@/infrastructure/cache/redis.cache.js";
import { cacheKeys, cacheTtlSeconds } from "@/infrastructure/cache/cache-keys.js";
import { cacheHash } from "@/shared/utils/cache-hash.js";
import { OutboxEventRepository } from "@/infrastructure/events/outbox/outbox-event.repository.js";
import { serializeDomainEvent } from "@/infrastructure/events/bus/serialized-domain-event.js";

type Actor = {
  userId: string;
  role: string;
  organizationId?: string;
  vendorId?: string;
};

const managerRoles: string[] = [ROLES.ADMIN, ROLES.FACILITY_MANAGER];
const vendorApplicantRoles: string[] = [
  ROLES.VENDOR_LEAD,
  ROLES.VENDOR_MANAGER,
];

export class WorkOrderService {
  private repository = new WorkOrderRepository();
  private cache = new RedisCache();
  private outbox = new OutboxEventRepository();

  private async invalidateDerivedCaches(organizationId?: string) {
    if (!organizationId) return;
    await this.cache.deleteByPattern(`${cacheKeys.tenantPrefix(organizationId)}dashboard:*`);
  }

  async list(
    actor: Actor,
    options: {
      page: number;
      limit: number;
      status?: string;
      priority?: string;
      search?: string;
      cursor?: string;
    },
  ) {
    if (!actor.organizationId)
      throw new AuthorizationException("Organization context required");
    const listKey = cacheKeys.workOrderList(actor.organizationId, cacheHash(options));
    const cachedList = await this.cache.get<{ data: IWorkOrder[]; pagination: { page: number; limit: number; total: number; pages: number } }>(listKey);
    if (cachedList) return cachedList;
    const filter: Record<string, unknown> = {
      organizationId: actor.organizationId,
    };
    if (options.status && options.status !== "all")
      filter.status = options.status;
    if (options.priority && options.priority !== "all")
      filter.priority = options.priority;
    if (options.search)
      filter.$or = [
        { title: { $regex: options.search, $options: "i" } },
        { _id: options.search },
      ];
    const cursor = options.cursor ? JSON.parse(Buffer.from(options.cursor, "base64url").toString("utf8")) as { createdAt: string; id: string } : undefined;
    const [data, total] = await Promise.all([
      cursor ? this.repository.findCursorPage(filter, { createdAt: new Date(cursor.createdAt), id: cursor.id }, options.limit) : this.repository.findPage(filter, (options.page - 1) * options.limit, options.limit),
      this.repository.count(filter),
    ]);
    const hasMore = Boolean(options.cursor && data.length > options.limit);
    const items = hasMore ? data.slice(0, options.limit) : data;
    const last = items[items.length - 1];
    const nextCursor = hasMore && last ? Buffer.from(JSON.stringify({ createdAt: last.createdAt, id: last._id })).toString("base64url") : undefined;
    const result = {
      data: items,
      pagination: {
        page: options.page,
        limit: options.limit,
        total,
        pages: Math.ceil(total / options.limit),
      },
      ...(options.cursor ? { nextCursor, hasMore } : {}),
    };
    await this.cache.set(listKey, result, cacheTtlSeconds.list);
    return result;
  }

  async listForVendor(actor: Actor, options: { page: number; limit: number }) {
    if (![...vendorApplicantRoles, ROLES.VENDOR_TECHNICIAN].includes(actor.role))
      throw new AuthorizationException("Vendor context required");
    const vendorId = actor.vendorId ?? (await User.findById(actor.userId).select("vendorId"))?.vendorId?.toString();
    if (!vendorId)
      throw new AuthorizationException("Vendor context required");
    const filter: Record<string, unknown> = { assignedVendorId: vendorId };
    if (actor.role === ROLES.VENDOR_TECHNICIAN)
      filter.assignedVendorTechnicianId = actor.userId;
    const [data, total] = await Promise.all([
      this.repository.findPage(filter, (options.page - 1) * options.limit, options.limit),
      this.repository.count(filter),
    ]);
    return {
      data,
      pagination: {
        page: options.page,
        limit: options.limit,
        total,
        pages: Math.ceil(total / options.limit),
      },
    };
  }

  async get(id: string, actor: Actor) {
    const isVendor = [ROLES.VENDOR_LEAD, ROLES.VENDOR_MANAGER, ROLES.VENDOR_TECHNICIAN].includes(actor.role as typeof ROLES.VENDOR_LEAD | typeof ROLES.VENDOR_MANAGER | typeof ROLES.VENDOR_TECHNICIAN);
    if (isVendor) {
      const vendorId = actor.vendorId ?? (await User.findById(actor.userId).select("vendorId"))?.vendorId?.toString();
      if (!vendorId) throw new AuthorizationException("Vendor context required");
      actor.vendorId = vendorId;
      const filter: Record<string, unknown> = { _id: id, assignedVendorId: vendorId };
      if (actor.role === ROLES.VENDOR_TECHNICIAN) filter.assignedVendorTechnicianId = actor.userId;
      const workOrder = await WorkOrder.findOne(filter);
      if (!workOrder) throw new NotFoundException("Work order not found");
      return workOrder;
    }
    if (!actor.organizationId) throw new AuthorizationException("Organization context required");
    const workOrder = await this.repository.findOneByOrganization(id, actor.organizationId);
    if (!workOrder) throw new NotFoundException("Work order not found");
    return workOrder;
  }

  async update(id: string, input: UpdateWorkOrderInput, actor: Actor) {
    this.assertManager(actor);
    const workOrder = await this.get(id, actor);
    Object.assign(workOrder, input);
    const saved = await this.saveWithOutbox(workOrder, "WorkOrderStatusChanged", actor.userId);
    if (actor.organizationId) await this.cache.delete(cacheKeys.workOrder(actor.organizationId, id));
    if (actor.organizationId) await this.cache.deleteByPattern(`${cacheKeys.tenantPrefix(actor.organizationId)}work-orders:list:*`);
    return saved;
  }

  async archive(id: string, actor: Actor) {
    this.assertManager(actor);
    const workOrder = await this.get(id, actor);
    if (
        WORK_ORDER_STATUS.IN_PROGRESS === workOrder.status ||
        WORK_ORDER_STATUS.PENDING_COMPLETION ===workOrder.status) {

      throw new BusinessException("Active work orders cannot be archived");
      }
    workOrder.status = WORK_ORDER_STATUS.CANCELLED;
    const saved = await this.saveWithOutbox(workOrder, "WorkOrderStatusChanged", actor.userId);
    if (actor.organizationId) await this.cache.delete(cacheKeys.workOrder(actor.organizationId, id));
    if (actor.organizationId) await this.cache.deleteByPattern(`${cacheKeys.tenantPrefix(actor.organizationId)}work-orders:list:*`);
    return saved;
  }

  async create(
    data: CreateWorkOrderInput & { serviceRequestId?: string },
    actor: Actor,
  ): Promise<ApplicationResult<IWorkOrder>> {
    this.assertManager(actor);
    if (!actor.organizationId || actor.organizationId !== data.organizationId) {
      throw new AuthorizationException(
        "Work order organization does not match the current tenant",
      );
    }
    await this.assertHierarchy(
      data.organizationId,
      data.facilityId,
      data.locationId,
      data.assetId,
    );

    const base = {
      organizationId: toObjectId(data.organizationId),
      facilityId: toObjectId(data.facilityId),
      title: data.title,
      description: data.description,
      priority: data.priority,
      serviceCategory: data.serviceCategory,
      ...(data.dueDate ? { dueDate: data.dueDate } : {}),
      fulfillmentType: data.fulfillmentType,
      createdBy: toObjectId(actor.userId),
    };

    const optionalRefs: {
      assetId?: Types.ObjectId;
      locationId?: Types.ObjectId;
      serviceRequestId?: Types.ObjectId;
    } = {};

    if (data.assetId) {
      optionalRefs.assetId = toObjectId(data.assetId);
    }
    if (data.locationId) optionalRefs.locationId = toObjectId(data.locationId);
    if (data.serviceRequestId) optionalRefs.serviceRequestId = toObjectId(data.serviceRequestId);

    if (data.fulfillmentType === FULFILLMENT_TYPE.MARKETPLACE) {
      const workOrder = await this.createWithOutbox({
        ...base,
        ...optionalRefs,
        status: WORK_ORDER_STATUS.OPEN,
      }, actor.userId);
      await this.invalidateDerivedCaches(actor.organizationId);
      return {
        success: true,
        message: "Work order created successfully",
        data: workOrder,
      };
    }

    const technicianId = data.technicianId;

    if (!technicianId) {
      throw new ValidationException("technicianId is required");
    }

    await this.assertInternalTechnician(technicianId, data.organizationId);

    const workOrder = await this.createWithOutbox({
      ...base,
      ...optionalRefs,
      status: WORK_ORDER_STATUS.ASSIGNED,
      assignedTechnicianId: toObjectId(technicianId),
    }, actor.userId);
    await this.invalidateDerivedCaches(actor.organizationId);
    return {
      success: true,
      message: "Work order created successfully",
      data: workOrder,
    };
  }

  async createFromServiceRequest(
    data: CreateWorkOrderInput & { serviceRequestId: string },
    actor: Actor,
  ): Promise<ApplicationResult<IWorkOrder>> {
    const existing = await this.repository.findByServiceRequestId(
      data.serviceRequestId,
    );
    if (existing)
      return {
        success: true,
        message: "Work order already exists for this service request",
        data: existing,
      };
    let result: ApplicationResult<IWorkOrder>;
    try {
      result = await this.create(data, actor);
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        const concurrent = await this.repository.findByServiceRequestId(data.serviceRequestId);
        if (concurrent) return { success: true, message: "Work order already exists for this service request", data: concurrent };
      }
      throw error;
    }
    if (!result.data) {
      throw new InternalServerException("Failed to create work order");
    }
    return {
      success: true,
      message: "Work order created from service request successfully",
      data: result.data,
    };
  }

  async listOpenForVendor(
    actor: Actor,
  ): Promise<ApplicationResult<IWorkOrder[]>> {
    this.assertVendorApplicant(actor);

    const user = await User.findById(actor.userId).select("vendorId");

    if (!user?.vendorId) {
      throw new AuthorizationException(
        "Vendor user is not attached to a vendor",
      );
    }

    const vendor = await Vendor.findById(user.vendorId).select(
      "serviceCategories coverageRadiusKm baseCoordinates status",
    );

    if (!vendor || vendor.status !== "active") {
      throw new AuthorizationException("Vendor is not active");
    }

    const relationships = await OrganizationVendorRelationship.find({
      vendorId: user.vendorId,
      status: "active",
    }).limit(100);
    if (!relationships.length)
      throw new AuthorizationException(
        "Vendor has no active marketplace relationship",
      );
    const organizationIds = relationships.map(
      (relationship) => relationship.organizationId,
    );
    const query: Record<string, unknown> = {
      status: WORK_ORDER_STATUS.OPEN,
      fulfillmentType: FULFILLMENT_TYPE.MARKETPLACE,
      assignedVendorId: { $exists: false },
      serviceCategory: { $in: vendor.serviceCategories },
      organizationId: { $in: organizationIds },
    };
    const workOrders = await this.repository.findOpenMarketplace(query);
    const facilities = await Facility.find({
      _id: { $in: workOrders.map((item) => item.facilityId) },
    }).select("_id coordinates");
    const facilityMap = new Map(
      facilities.map((facility) => [facility._id.toString(), facility]),
    );
    const authorizedFacilities = await FacilityVendor.find({
      vendorId: user.vendorId,
      organizationId: { $in: organizationIds },
    }).distinct("facilityId");
    const authorized = new Set(authorizedFacilities.map((id) => id.toString()));
    const policies = await MarketplaceGeographicPolicy.find({
      organizationId: { $in: organizationIds },
      enabled: true,
    }).limit(100);
    const policyMap = new Map(
      policies.map((policy) => [
        `${policy.organizationId.toString()}:${policy.priority}`,
        policy.maxDistanceKm,
      ]),
    );
    const eligible = workOrders.filter((workOrder) => {
      const facility = facilityMap.get(workOrder.facilityId.toString());
      if (!facility || !authorized.has(workOrder.facilityId.toString()))
        return false;
      const maximumDistance = policyMap.get(
        `${workOrder.organizationId.toString()}:${workOrder.priority}`,
      );
      if (maximumDistance === undefined) return false;
      return distanceInKilometers(
        vendor.baseCoordinates?.coordinates,
        facility.coordinates.coordinates,
        Math.min(vendor.coverageRadiusKm ?? 0, maximumDistance),
      );
    });

    return {
      success: true,
      message: "Open marketplace work orders retrieved successfully",
      data: eligible,
    };
  }

  async listVendorCandidates(id: string, actor: Actor) {
    this.assertManager(actor);
    const workOrder = await this.get(id, actor);
    if (
      workOrder.fulfillmentType !== FULFILLMENT_TYPE.MARKETPLACE ||
      workOrder.status !== WORK_ORDER_STATUS.OPEN
    ) {
      throw new BusinessException(
        "Work order is not available for vendor sourcing",
      );
    }
    const facility = await Facility.findOne({
      _id: workOrder.facilityId,
      organizationId: actor.organizationId,
    }).select("coordinates");
    if (!facility) throw new NotFoundException("Work order facility not found");
    const relationships = await OrganizationVendorRelationship.find({
      organizationId: actor.organizationId,
      status: "active",
    }).select("vendorId");
    const facilityVendors = await FacilityVendor.find({
      organizationId: actor.organizationId,
      facilityId: workOrder.facilityId,
    }).select("vendorId");
    const allowed = new Set(
      facilityVendors.map((item) => item.vendorId.toString()),
    );
    const vendors = await Vendor.find({
      _id: { $in: relationships.map((item) => item.vendorId) },
      status: "active",
      serviceCategories: workOrder.serviceCategory,
    });
    const policies = await MarketplaceGeographicPolicy.findOne({
      organizationId: actor.organizationId,
      priority: workOrder.priority,
      enabled: true,
    });
    if (!policies)
      return {
        data: [],
        pagination: { page: 1, limit: 100, total: 0, pages: 0 },
      };
    const data = vendors
      .filter((vendor) => {
        if (
          !allowed.has(vendor._id.toString()) ||
          !vendor.baseCoordinates?.coordinates?.length
        )
          return false;
        return distanceInKilometers(
          vendor.baseCoordinates.coordinates,
          facility.coordinates.coordinates,
          Math.min(vendor.coverageRadiusKm ?? 0, policies.maxDistanceKm),
        );
      })
      .map((vendor) => ({
        vendorId: vendor._id.toString(),
        name: vendor.name,
        serviceCategories: vendor.serviceCategories,
        distanceKm: distanceInKilometers(
          vendor.baseCoordinates!.coordinates,
          facility.coordinates.coordinates,
          Math.min(vendor.coverageRadiusKm ?? 0, policies.maxDistanceKm)
        ),
        averageRating: vendor.averageRating,
        completedJobs: vendor.completedJobs,
      }));
    return {
      data,
      pagination: {
        page: 1,
        limit: 100,
        total: data.length,
        pages: data.length ? 1 : 0,
      },
    };
  }

  async updateProgress(
    workOrderId: string,
    data: UpdateProgressInput,
    actor: Actor,
  ): Promise<ApplicationResult<IWorkOrder>> {
    const workOrder = await this.get(workOrderId, actor);

    if (!workOrder) {
      throw new NotFoundException("Work order not found");
    }

    if (!this.isAssignedWorker(workOrder, actor)) {
      throw new AuthorizationException(
        "Only the assigned worker can update progress",
      );
    }

    if (
      data.status === WORK_ORDER_STATUS.IN_PROGRESS &&
      workOrder.status !== WORK_ORDER_STATUS.ASSIGNED
    ) {
      throw new BusinessException(
        "Work order must be assigned before progress starts",
      );
    }

    if (
      data.status === WORK_ORDER_STATUS.PENDING_COMPLETION &&
      workOrder.status !== WORK_ORDER_STATUS.IN_PROGRESS
    ) {
      throw new BusinessException(
        "Work order must be in progress before completion review",
      );
    }

    workOrder.status = data.status;
    const saved = await this.saveWithOutbox(workOrder, "WorkOrderStatusChanged", actor.userId);
    await this.invalidateDerivedCaches(actor.organizationId ?? workOrder.organizationId?.toString());

    return {
      success: true,
      message: "Work order progress updated successfully",
      data: saved,
    };
  }

  async transition(
    id: string,
    status: "in_progress" | "on_hold" | "pending_completion",
    actor: Actor,
    reason?: string,
  ): Promise<ApplicationResult<IWorkOrder>> {
    const workOrder = await this.get(id, actor);
    const assignedVendor = actor.vendorId && isSameObjectId(workOrder.assignedVendorId, actor.vendorId);
    if (!this.isAssignedWorker(workOrder, actor) && !([ROLES.VENDOR_LEAD, ROLES.VENDOR_MANAGER].includes(actor.role as typeof ROLES.VENDOR_LEAD | typeof ROLES.VENDOR_MANAGER) && assignedVendor))
      throw new AuthorizationException(
        "Only the assigned worker can update progress",
      );
    const allowed: Record<string, string[]> = {
      assigned: [WORK_ORDER_STATUS.IN_PROGRESS],
      in_progress: [
        WORK_ORDER_STATUS.ON_HOLD,
        WORK_ORDER_STATUS.PENDING_COMPLETION,
      ],
      on_hold: [WORK_ORDER_STATUS.IN_PROGRESS],
    };
    if (!allowed[workOrder.status]?.includes(status))
      throw new BusinessException("Invalid work order status transition");
    workOrder.status = status;
    workOrder.statusHistory = workOrder.statusHistory || [];
    workOrder.statusHistory.push({
      status,
      changedAt: new Date(),
      changedBy: toObjectId(actor.userId),
      reason,
    });
    const saved = await this.saveWithOutbox(workOrder, "WorkOrderStatusChanged", actor.userId);
    await this.invalidateDerivedCaches(actor.organizationId ?? workOrder.organizationId?.toString());
    return {
      success: true,
      message: "Work order status updated successfully",
      data: saved,
    };
  }

  async assign(
    id: string,
    data: AssignWorkOrderInput,
    actor: Actor,
  ): Promise<ApplicationResult<IWorkOrder>> {
    this.assertManager(actor);
    const workOrder = await this.get(id, actor);
    if (
      WORK_ORDER_STATUS.OPEN !==  workOrder.status &&  WORK_ORDER_STATUS.ASSIGNED !==
        workOrder.status
    ) {
      throw new BusinessException(
        "Work order is not available for internal assignment",
      );
    }
    await this.assertInternalTechnician(
      data.technicianId,
      actor.organizationId!,
    );
    workOrder.assignedTechnicianId = toObjectId(data.technicianId);
    workOrder.assignedVendorId = undefined;
    workOrder.assignedVendorTechnicianId = undefined;
    workOrder.status = WORK_ORDER_STATUS.ASSIGNED;
    const saved = await this.saveWithOutbox(workOrder, "WorkOrderAssigned", actor.userId);
    return {
      success: true,
      message: "Work order assigned successfully",
      data: saved,
    };
  }

  async listTechnicianCandidates(id: string, actor: Actor) {
    this.assertManager(actor);
    await this.get(id, actor);
    const users = await User.find({
      organizationId: actor.organizationId,
      role: ROLES.TECHNICIAN,
      status: "active",
    })
      .select("_id firstName lastName email")
      .sort({ firstName: 1, lastName: 1 })
      .limit(100);
    return {
      data: users.map((user) => ({
        id: user._id.toString(),
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
      })),
    };
  }

  async approveCompletion(
    workOrderId: string,
    actor: Actor,
  ): Promise<ApplicationResult<IWorkOrder>> {
    this.assertApprovalActor(actor);

    const workOrder = await this.repository.findById(workOrderId);

    if (!workOrder) {
      throw new NotFoundException("Work order not found");
    }
    if (workOrder.organizationId.toString() !== actor.organizationId) {
      throw new NotFoundException("Work order not found");
    }

    if (workOrder.status !== WORK_ORDER_STATUS.PENDING_COMPLETION) {
      throw new BusinessException(
        "Only pending completion work orders can be approved",
      );
    }

    const now = new Date();
    workOrder.status = WORK_ORDER_STATUS.COMPLETED;
    workOrder.approvedBy = toObjectId(actor.userId);
    workOrder.approvedAt = now;
    workOrder.completedAt = now;

    const saved = await this.saveWithOutbox(workOrder, "WorkOrderStatusChanged", actor.userId);

    return {
      success: true,
      message: "Work order completion approved successfully",
      data: saved,
    };
  }

  async rejectCompletion(
    workOrderId: string,
    data: RejectCompletionInput,
    actor: Actor,
  ): Promise<ApplicationResult<IWorkOrder>> {
    this.assertApprovalActor(actor);

    const workOrder = await this.repository.findById(workOrderId);

    if (!workOrder) {
      throw new NotFoundException("Work order not found");
    }
    if (workOrder.organizationId.toString() !== actor.organizationId) {
      throw new NotFoundException("Work order not found");
    }

    if (workOrder.status !== WORK_ORDER_STATUS.PENDING_COMPLETION) {
      throw new BusinessException(
        "Only pending completion work orders can be rejected",
      );
    }

    workOrder.status = WORK_ORDER_STATUS.IN_PROGRESS;
    workOrder.rejectionReason = data.rejectionReason;
    workOrder.reviewedBy = toObjectId(actor.userId);
    workOrder.reviewedAt = new Date();

    const saved = await this.saveWithOutbox(workOrder, "WorkOrderStatusChanged", actor.userId);

    return {
      success: true,
      message: "Work order completion rejected successfully",
      data: saved,
    };
  }

  async requestInformation(workOrderId: string, data: RequestInformationInput, actor: Actor): Promise<ApplicationResult<IWorkOrder>> {
    this.assertApprovalActor(actor);
    const workOrder = await this.repository.findById(workOrderId);
    if (!workOrder || workOrder.organizationId.toString() !== actor.organizationId) throw new NotFoundException("Work order not found");
    if (workOrder.status !== WORK_ORDER_STATUS.PENDING_COMPLETION) throw new BusinessException("Only pending completion work orders can request information");
    workOrder.status = WORK_ORDER_STATUS.PENDING_COMPLETION;
    workOrder.approvalNotes = data.note;
    workOrder.reviewedBy = toObjectId(actor.userId);
    workOrder.reviewedAt = new Date();
    const saved = await this.saveWithOutbox(workOrder, "WorkOrderStatusChanged", actor.userId);
    return { success: true, message: "Additional information requested", data: saved };
  }

  private assertManager(actor: Actor) {
    if (!managerRoles.includes(actor.role)) {
      throw new AuthorizationException(
        "Only admin or facility manager can perform this action",
      );
    }
  }

  private assertApprovalActor(actor: Actor) {
    if (![...managerRoles, ROLES.FINANCE].includes(actor.role)) {
      throw new AuthorizationException(
        "Only finance, admin, or facility manager can review completion",
      );
    }
  }

  private async createWithOutbox(
    data: Partial<IWorkOrder>,
    actorId: string,
  ): Promise<IWorkOrder> {
    const session = await mongoose.startSession();
    try {
      let created!: IWorkOrder;
      await session.withTransaction(async () => {
        created = await this.repository.create(data, session);
        const event = new BusinessFactEvent(
          "WorkOrderCreated",
          {
            workOrderId: created._id.toString(),
            facilityId: created.facilityId.toString(),
            ...(created.assignedVendorId
              ? { assignedVendorId: created.assignedVendorId.toString() }
              : {}),
            ...(created.assignedTechnicianId
              ? { assignedTechnicianId: created.assignedTechnicianId.toString() }
              : {}),
          },
          {
            organizationId: created.organizationId.toString(),
            actorId,
            aggregateType: "work_order",
            aggregateId: created._id.toString(),
          },
        );
        await this.outbox.append(
          {
            eventId: event.eventId,
            eventType: event.name,
            aggregateId: event.aggregateId,
            aggregateType: event.aggregateType,
            payload: serializeDomainEvent(event) as unknown as Record<string, unknown>,
          },
          session,
        );
      });
      return created;
    } finally {
      await session.endSession();
    }
  }

  private async saveWithOutbox(
    workOrder: IWorkOrder,
    eventName: "WorkOrderAssigned" | "WorkOrderStatusChanged",
    actorId: string,
  ): Promise<IWorkOrder> {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        await workOrder.save({ session });
        const event = new BusinessFactEvent(
          eventName,
          {
            workOrderId: workOrder._id.toString(),
            facilityId: workOrder.facilityId.toString(),
            ...(workOrder.assignedVendorId
              ? { assignedVendorId: workOrder.assignedVendorId.toString() }
              : {}),
            ...(workOrder.assignedTechnicianId
              ? { assignedTechnicianId: workOrder.assignedTechnicianId.toString() }
              : {}),
          },
          {
            organizationId: workOrder.organizationId.toString(),
            actorId,
            aggregateType: "work_order",
            aggregateId: workOrder._id.toString(),
          },
        );
        await this.outbox.append(
          {
            eventId: event.eventId,
            eventType: event.name,
            aggregateId: event.aggregateId,
            aggregateType: event.aggregateType,
            payload: serializeDomainEvent(event) as unknown as Record<string, unknown>,
          },
          session,
        );
      });
      return workOrder;
    } finally {
      await session.endSession();
    }
  }

  private assertVendorApplicant(actor: Actor) {
    if (!vendorApplicantRoles.includes(actor.role)) {
      throw new AuthorizationException(
        "Only vendor lead or vendor manager can apply",
      );
    }
  }

  private async assertInternalTechnician(
    technicianId: string,
    organizationId: string,
  ) {
    const technician = await User.findById(technicianId).select(
      "role organizationId",
    );

    if (!technician || technician.role !== ROLES.TECHNICIAN) {
      throw new ValidationException(
        "Only internal technicians can be assigned",
      );
    }

    if (!isSameObjectId(technician.organizationId, organizationId)) {
      throw new ValidationException(
        "Technician does not belong to this organization",
      );
    }
    if (technician.status !== "active") {
      throw new ValidationException("Technician is not active");
    }
  }

  private async assertHierarchy(
    organizationId: string,
    facilityId: string,
    locationId?: string,
    assetId?: string,
  ) {
    const facility = await Facility.findOne({
      _id: facilityId,
      organizationId,
    });
    if (!facility)
      throw new ValidationException(
        "Facility does not belong to this organization",
      );
    if (locationId) {
      const location = await Location.findOne({
        _id: locationId,
        organizationId,
        facilityId,
      });
      if (!location)
        throw new ValidationException(
          "Location does not belong to this facility",
        );
    }
    if (assetId) {
      const asset = await Asset.findOne({
        _id: assetId,
        organizationId,
        facilityId,
        ...(locationId ? { locationId } : {}),
      });
      if (!asset)
        throw new ValidationException(
          "Asset does not belong to the selected facility and location",
        );
    }
  }

  private isAssignedWorker(
    workOrder: {
      assignedTechnicianId?: Types.ObjectId;
      assignedVendorTechnicianId?: Types.ObjectId;
    },
    actor: Actor,
  ) {
    if (actor.role === ROLES.TECHNICIAN) {
      return isSameObjectId(workOrder.assignedTechnicianId, actor.userId);
    }

    if (actor.role === ROLES.VENDOR_TECHNICIAN) {
      return isSameObjectId(workOrder.assignedVendorTechnicianId, actor.userId);
    }

    return false;
  }
}
