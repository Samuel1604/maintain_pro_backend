import { Types } from "mongoose";
import { AppError } from "@/shared/errors/AppError.js";
import { ROLES } from "@/shared/constants/roles.js";
import { WorkOrderService } from "@/modules/work-orders/work-order.service.js";
import type {
  ApproveServiceRequestInput,
  CreateServiceRequestInput,
  RejectServiceRequestInput,
} from "./request.schema.js";
import type { CreateWorkOrderInput } from "@/modules/work-orders/work-order.schema.js";
import { ServiceRequestRepository } from "./request.repository.js";

type Actor = {
  userId: string;
  role: string;
};

const managerRoles: string[] = [ROLES.ADMIN, ROLES.FACILITY_MANAGER];

export class ServiceRequestService {
  private workOrders = new WorkOrderService();
  private repository = new ServiceRequestRepository();

  async create(data: CreateServiceRequestInput, actor: Actor) {
    const allowedRoles: string[] = [
      ROLES.ADMIN,
      ROLES.FACILITY_MANAGER,
      ROLES.TECHNICIAN,
      ROLES.FINANCE,
      ROLES.STAFF,
    ];

    if (!allowedRoles.includes(actor.role)) {
      throw new AppError("This role cannot create service requests", 403);
    }

    return this.repository.create({
      ...data,
      requestedBy: new Types.ObjectId(actor.userId),
      status: "pending",
    });
  }

  async approve(
    serviceRequestId: string,
    data: ApproveServiceRequestInput,
    actor: Actor,
  ) {
    if (!managerRoles.includes(actor.role)) {
      throw new AppError(
        "Only admin or facility manager can approve requests",
        403,
      );
    }

    const serviceRequest = await this.repository.findById(serviceRequestId);

    if (!serviceRequest) {
      throw new AppError("Service request not found", 404);
    }

    if (serviceRequest.status !== "pending") {
      throw new AppError("Only pending service requests can be approved", 400);
    }

    const workOrderInput: CreateWorkOrderInput = {
      organizationId: serviceRequest.organizationId.toString(),
      facilityId: serviceRequest.facilityId.toString(),
      title: serviceRequest.title,
      description: serviceRequest.description,
      priority: serviceRequest.priority,
      serviceCategory: serviceRequest.serviceCategory,
      fulfillmentType: data.fulfillmentType,
    };

    if (serviceRequest.assetId) {
      workOrderInput.assetId = serviceRequest.assetId.toString();
    }

    if (data.technicianId) {
      workOrderInput.technicianId = data.technicianId;
    }

    const workOrder = await this.workOrders.createFromServiceRequest(
      {
        ...workOrderInput,
        serviceRequestId,
      },
      actor,
    );

    serviceRequest.status = "approved";
    serviceRequest.approvedBy = new Types.ObjectId(actor.userId);
    serviceRequest.approvedAt = new Date();
    serviceRequest.workOrderId = workOrder._id as Types.ObjectId;

    await serviceRequest.save();

    return {
      serviceRequest,
      workOrder,
    };
  }

  async reject(
    serviceRequestId: string,
    data: RejectServiceRequestInput,
    actor: Actor,
  ) {
    if (!managerRoles.includes(actor.role)) {
      throw new AppError(
        "Only admin or facility manager can reject requests",
        403,
      );
    }

    const serviceRequest = await this.repository.findById(serviceRequestId);

    if (!serviceRequest) {
      throw new AppError("Service request not found", 404);
    }

    if (serviceRequest.status !== "pending") {
      throw new AppError("Only pending service requests can be rejected", 400);
    }

    serviceRequest.status = "rejected";
    serviceRequest.rejectedBy = new Types.ObjectId(actor.userId);
    serviceRequest.rejectedAt = new Date();
    serviceRequest.rejectionReason = data.rejectionReason;

    return serviceRequest.save();
  }
}
