import mongoose, { Types } from "mongoose";
import {
  AuthorizationException,
  NotFoundException,
  BusinessException,
  InternalServerException,
} from "@/shared/errors/index.js";
import { ROLES } from "@/shared/constants/roles.js";
import { Upload } from "@/modules/uploads/upload.model.js";
import { WorkOrderService } from "@/modules/work-orders/work-order.service.js";
import type {
  ApproveServiceRequestInput,
  CreateServiceRequestInput,
  RejectServiceRequestInput,
} from "./request.schema.js";
import type { CreateWorkOrderInput } from "@/modules/work-orders/work-order.schema.js";
import { ServiceRequestRepository } from "./request.repository.js";
import type { ApplicationResult } from "@/shared/application-result/index.js";
import type { IServiceRequest } from "./request.model.js";
import type { IWorkOrder } from "@/modules/work-orders/work-order.model.js";
import { FacilityRepository } from "@/modules/facilities/facility.repository.js";
import { LocationRepository } from "@/modules/locations/location.repository.js";
import { AssetRepository } from "@/modules/assets/asset.repository.js";
import { assetHistoryService } from "@/modules/asset-history/asset-history.service.js";
import { ASSET_HISTORY_EVENTS } from "@/modules/asset-history/asset-history.types.js";
import { toServiceRequestResponse, type ServiceRequestResponse } from "./request.dto.js";
import { BusinessFactEvent } from "@/infrastructure/events/business-fact.event.js";
import { OutboxEventRepository } from "@/infrastructure/events/outbox/outbox-event.repository.js";
import { serializeDomainEvent } from "@/infrastructure/events/bus/serialized-domain-event.js";

type Actor = {
  userId: string;
  role: string;
  organizationId?: string;
};

const managerRoles: string[] = [ROLES.ADMIN, ROLES.FACILITY_MANAGER];

export class ServiceRequestService {
  private workOrders = new WorkOrderService();
  private repository = new ServiceRequestRepository();
  private facilities = new FacilityRepository();
  private locations = new LocationRepository();
  private assets = new AssetRepository();
  private outbox = new OutboxEventRepository();

  async update(id: string, data: import("./request.schema.js").UpdateServiceRequestInput, actor: Actor): Promise<ServiceRequestResponse> {
    if (!actor.organizationId) throw new AuthorizationException("Organization context required");
    const item = await this.repository.findById(id);
    if (!item) throw new NotFoundException("Service request not found");
    if (item.organizationId.toString() !== actor.organizationId) throw new AuthorizationException("Organization access denied");
    if (item.status !== "pending") throw new BusinessException("Only pending service requests can be edited");
    if (actor.role === ROLES.STAFF && item.requestedBy.toString() !== actor.userId) throw new AuthorizationException("Service request access denied");
    Object.assign(item, data);
    await item.save();
    return toServiceRequestResponse(item);
  }

  async getById(id: string, actor: Actor): Promise<ServiceRequestResponse> {
    if (!actor.organizationId) throw new AuthorizationException("Organization context required");
    const item = await this.repository.findById(id);
    if (!item) throw new NotFoundException("Service request not found");
    if (item.organizationId.toString() !== actor.organizationId) throw new AuthorizationException("Organization access denied");
    if (actor.role === ROLES.STAFF && item.requestedBy.toString() !== actor.userId) throw new AuthorizationException("Service request access denied");
    return toServiceRequestResponse(item);
  }

  async list(actor: Actor, input: { page: number; limit: number; from?: Date; to?: Date; status?: IServiceRequest["status"] }): Promise<{ data: ServiceRequestResponse[]; pagination: { page: number; limit: number; total: number; pages: number } }> {
    if (!actor.organizationId) throw new AuthorizationException("Organization context required");
    const filter: Record<string, unknown> = { organizationId: actor.organizationId };
    if (actor.role === ROLES.STAFF) filter.requestedBy = actor.userId;
    if (input.status) filter.status = input.status;
    if (input.from || input.to) filter.createdAt = { ...(input.from ? { $gte: input.from } : {}), ...(input.to ? { $lte: input.to } : {}) };
    const [items, total] = await Promise.all([this.repository.findPage(filter, (input.page - 1) * input.limit, input.limit), this.repository.count(filter)]);
    return { data: items.map((item) => toServiceRequestResponse(item as unknown as IServiceRequest)), pagination: { page: input.page, limit: input.limit, total, pages: Math.ceil(total / input.limit) } };
  }

  async create(data: CreateServiceRequestInput, actor: Actor): Promise<ApplicationResult<IServiceRequest>> {
    const allowedRoles: string[] = [
      ROLES.ADMIN,
      ROLES.FACILITY_MANAGER,
      ROLES.TECHNICIAN,
      ROLES.FINANCE,
      ROLES.STAFF,
    ];

    if (!allowedRoles.includes(actor.role)) {
      throw new AuthorizationException("This role cannot create service requests");
    }

    if (data.organizationId !== actor.organizationId) throw new AuthorizationException("Organization access denied");
    if (data.sourceWorkOrderId) {
      const source = await import("@/modules/work-orders/work-order.model.js").then(({ WorkOrder }) => WorkOrder.findOne({ _id: data.sourceWorkOrderId, organizationId: actor.organizationId }));
      if (!source) throw new NotFoundException("Source work order not found");
      const permitted = managerRoles.includes(actor.role) || (actor.role === ROLES.TECHNICIAN && source.assignedTechnicianId?.toString() === actor.userId);
      if (!permitted) throw new AuthorizationException("You are not assigned to this work order");
      if (!data.facilityId) data.facilityId = source.facilityId.toString();
      if (!data.locationId) data.locationId = source.locationId?.toString();
      if (!data.assetId) data.assetId = source.assetId?.toString();
    }
    if (!data.facilityId || !data.locationId) throw new AuthorizationException("Facility and location are required");
    const facility = await this.facilities.findById(data.facilityId);
    const location = await this.locations.findById(data.locationId);
    if (!facility || facility.organizationId.toString() !== actor.organizationId || !location || location.organizationId.toString() !== actor.organizationId || location.facilityId.toString() !== data.facilityId) throw new AuthorizationException("Invalid facility or location context");
    if (data.assetId) { const asset = await this.assets.findByIdInOrganization(data.assetId, actor.organizationId!); if (!asset || asset.locationId.toString() !== data.locationId) throw new AuthorizationException("Asset does not belong to the selected location"); }
    if (data.attachmentUploadIds && data.attachmentUploadIds.length > 0) {
      for (const uploadId of data.attachmentUploadIds) {
        const upload = await Upload.findOne({
          _id: uploadId,
          actorId: actor.userId,
          purpose: "service-request-attachment",
          status: "available",
          ...(actor.organizationId ? { organizationId: actor.organizationId } : {}),
        });
        if (!upload) {
          throw new NotFoundException(`Upload ${uploadId} not found or not available as a service-request-attachment`);
        }
      }
    }

    const requestData = {
      ...data,
      attachmentUploadIds: data.attachmentUploadIds?.map(id => new Types.ObjectId(id)),
      requestedBy: new Types.ObjectId(actor.userId),
      status: managerRoles.includes(actor.role) ? "approved" : "pending",
      approvalDecision: managerRoles.includes(actor.role) ? "approved" : undefined,
      approvedBy: managerRoles.includes(actor.role) ? new Types.ObjectId(actor.userId) : undefined,
      approvedAt: managerRoles.includes(actor.role) ? new Date() : undefined,
    };
    const created = managerRoles.includes(actor.role)
      ? await this.repository.create(requestData)
      : await this.createPendingWithOutbox(requestData, actor);

    if (data.assetId) await assetHistoryService.append({ organizationId: actor.organizationId!, assetId: data.assetId, event: ASSET_HISTORY_EVENTS.SERVICE_REQUEST_CREATED, description: "Service request created for asset", actorId: actor.userId, sourceType: "service_request", sourceId: created._id.toString() });

    if (managerRoles.includes(actor.role)) {
      const workOrder = await this.createWorkOrder(created, actor, undefined);
      created.workOrderId = workOrder._id as Types.ObjectId;
      await this.saveRequestWithOutbox(created, "ServiceRequestApproved", actor.userId);
      return { success: true, message: "Service request approved and work order created", data: created };
    }

    // Pending requests already have their durable event in the outbox.
    return {
      success: true,
      message: "Service request created successfully",
      data: created,
    };
  }

  async approve(
    serviceRequestId: string,
    data: ApproveServiceRequestInput,
    actor: Actor,
  ): Promise<ApplicationResult<{ serviceRequest: IServiceRequest; workOrder: IWorkOrder }>> {
    if (!managerRoles.includes(actor.role)) {
      throw new AuthorizationException(
        "Only admin or facility manager can approve requests",
      );
    }

    const serviceRequest = await this.repository.findById(serviceRequestId);

    if (!serviceRequest) {
      throw new NotFoundException("Service request not found");
    }

    if (serviceRequest.organizationId.toString() !== actor.organizationId) {
      throw new AuthorizationException("Organization access denied");
    }

    if (serviceRequest.status !== "pending") {
      throw new BusinessException("Only pending service requests can be approved");
    }

    const workOrderInput: CreateWorkOrderInput = {
      organizationId: serviceRequest.organizationId.toString(),
      facilityId: serviceRequest.facilityId.toString(),
      locationId: serviceRequest.locationId.toString(),
      assetId: serviceRequest.assetId.toString(),
      title: serviceRequest.title,
      description: serviceRequest.description,
      priority: serviceRequest.priority,
      serviceCategory: serviceRequest.serviceCategory,
      fulfillmentType: data.fulfillmentType,
    };

    if (data.technicianId) {
      workOrderInput.technicianId = data.technicianId;
    }

    const woResult = await this.workOrders.createFromServiceRequest({ ...workOrderInput, serviceRequestId }, actor);

    if (!woResult.data) {
      throw new InternalServerException("Failed to create work order");
    }

    const workOrder = woResult.data;

    serviceRequest.status = "approved";
    serviceRequest.approvedBy = new Types.ObjectId(actor.userId);
    serviceRequest.approvedAt = new Date();
    serviceRequest.approvalDecision = "approved";
    serviceRequest.workOrderId = workOrder._id as Types.ObjectId;

    const savedRequest = await this.saveRequestWithOutbox(serviceRequest, "ServiceRequestApproved", actor.userId);
    if (serviceRequest.assetId) await assetHistoryService.append({ organizationId: serviceRequest.organizationId.toString(), assetId: serviceRequest.assetId.toString(), event: ASSET_HISTORY_EVENTS.SERVICE_REQUEST_APPROVED, description: "Asset service request approved", actorId: actor.userId, sourceType: "service_request", sourceId: serviceRequest._id.toString() });

    return {
      success: true,
      message: "Service request approved successfully",
      data: {
        serviceRequest: savedRequest,
        workOrder,
      },
    };
  }

  async reject(
    serviceRequestId: string,
    data: RejectServiceRequestInput,
    actor: Actor,
  ): Promise<ApplicationResult<IServiceRequest>> {
    if (!managerRoles.includes(actor.role)) {
      throw new AuthorizationException(
        "Only admin or facility manager can reject requests",
      );
    }

    const serviceRequest = await this.repository.findById(serviceRequestId);

    if (!serviceRequest) {
      throw new NotFoundException("Service request not found");
    }

    if (serviceRequest.organizationId.toString() !== actor.organizationId) {
      throw new AuthorizationException("Organization access denied");
    }

    if (serviceRequest.status !== "pending") {
      throw new BusinessException("Only pending service requests can be rejected");
    }

    serviceRequest.status = "rejected";
    serviceRequest.rejectedBy = new Types.ObjectId(actor.userId);
    serviceRequest.rejectedAt = new Date();
    serviceRequest.approvalDecision = "rejected";
    serviceRequest.rejectionReason = data.rejectionReason;

    const saved = await this.saveRequestWithOutbox(serviceRequest, "ServiceRequestRejected", actor.userId);
    if (serviceRequest.assetId) await assetHistoryService.append({ organizationId: serviceRequest.organizationId.toString(), assetId: serviceRequest.assetId.toString(), event: ASSET_HISTORY_EVENTS.SERVICE_REQUEST_REJECTED, description: "Asset service request rejected", actorId: actor.userId, sourceType: "service_request", sourceId: serviceRequest._id.toString(), data: { rejectionReason: data.rejectionReason } });

    return {
      success: true,
      message: "Service request rejected successfully",
      data: saved,
    };
  }

  private async createWorkOrder(request: IServiceRequest, actor: Actor, fulfillmentType: "internal" | "marketplace" = "marketplace") {
    const result = await this.workOrders.createFromServiceRequest({ organizationId: request.organizationId.toString(), facilityId: request.facilityId.toString(), locationId: request.locationId.toString(), assetId: request.assetId?.toString(), title: request.title, description: request.description, priority: request.priority, serviceCategory: request.serviceCategory, fulfillmentType, serviceRequestId: request._id.toString() }, actor);
    if (!result.data) throw new InternalServerException("Failed to create work order");
    if (request.assetId) await assetHistoryService.append({ organizationId: request.organizationId.toString(), assetId: request.assetId.toString(), event: ASSET_HISTORY_EVENTS.WORK_ORDER_CREATED, description: "Work order created from asset service request", actorId: actor.userId, sourceType: "work_order", sourceId: result.data._id.toString() });
    return result.data;
  }

  private async createPendingWithOutbox(
    data: Record<string, unknown>,
    actor: Actor,
  ): Promise<IServiceRequest> {
    const session = await mongoose.startSession();
    try {
      let created!: IServiceRequest;
      await session.withTransaction(async () => {
        created = await this.repository.create(data, session);
        const event = new BusinessFactEvent(
          "ServiceRequestCreated",
          {
            serviceRequestId: created._id.toString(),
            facilityId: created.facilityId.toString(),
          },
          {
            organizationId: created.organizationId.toString(),
            actorId: actor.userId,
            aggregateType: "service_request",
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

  private async saveRequestWithOutbox(
    request: IServiceRequest,
    eventName: "ServiceRequestApproved" | "ServiceRequestRejected",
    actorId: string,
  ): Promise<IServiceRequest> {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        await request.save({ session });
        const event = new BusinessFactEvent(
          eventName,
          {
            serviceRequestId: request._id.toString(),
            facilityId: request.facilityId.toString(),
          },
          {
            organizationId: request.organizationId.toString(),
            actorId,
            aggregateType: "service_request",
            aggregateId: request._id.toString(),
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
      return request;
    } finally {
      await session.endSession();
    }
  }
}
