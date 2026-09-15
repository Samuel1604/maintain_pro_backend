import { FacilityRepository } from "./facility.repository.js";
import { AccessControlService } from "@/shared/services/authorization.service.js";
import { BillingReader } from "@/modules/billing/billing.reader.js";
import type { EventPublisher } from "@/infrastructure/events/publisher/event-publisher.interface.js";
import { eventPublisher as defaultEventPublisher } from "@/container/index.js";
import {
  NotFoundException,
  AuthorizationException,
  BusinessException,
} from "@/shared/errors/index.js";
import {
  FacilityCreatedEvent,
  FacilityUpdatedEvent,
  FacilityDeactivatedEvent,
  FacilityDeletedEvent,
} from "./events/events.js";
import type { FacilityUpdatedPayload } from "./events/facility.event-payloads.js";
import type { JwtPayload } from "@/shared/types/jwt.types.js";
import type { CreateFacilityInput, UpdateFacilityInput } from "./facility.schema.js";
import type { ApplicationResult } from "@/shared/application-result/index.js";
import { facilityMapper } from "./dto/facility.mapper.js";
import type { FacilityResponse, ListFacilitiesResponse } from "./dto/facility.dto.js";

interface PaginationOptions {
  page: number;
  limit: number;
  status?: "active" | "inactive" | "suspended";
  sort?: "name" | "createdAt" | "-createdAt";
  search?: string;
}

// Use `ListFacilitiesResponse` from DTOs for paginated responses.

export class FacilityService {
  constructor(
    private readonly repository: FacilityRepository = new FacilityRepository(),
    private readonly accessControl: AccessControlService = new AccessControlService(),
    private readonly billingService: BillingReader = new BillingReader(),
    private readonly eventPublisher: EventPublisher = defaultEventPublisher,
  ) {}

  // ─── Query Operations ──────────────────────────────────────────────────────

  async findById(
    facilityId: string,
    actor: JwtPayload,
  ): Promise<ApplicationResult<FacilityResponse>> {
    this.accessControl.requireOrganization(actor);

    const facility = await this.repository.findById(facilityId);
    if (!facility) {
      throw new NotFoundException("Facility not found");
    }

    // Verify facility belongs to actor's organization
    if (facility.organizationId.toString() !== actor.organizationId) {
      throw new AuthorizationException("You do not have access to this facility");
    }

    return {
      success: true,
      message: "Facility retrieved successfully",
      data: facilityMapper.toResponse(facility),
    };
  }

  async findByOrganization(organizationId: string): Promise<ApplicationResult<FacilityResponse[]>> {
    const facilities = await this.repository.findByOrganization(organizationId);

    return {
      success: true,
      message: "Facilities retrieved successfully",
      data: facilityMapper.toResponseArray(facilities),
    };
  }

  async findByOrganizationPaginated(
    organizationId: string,
    options: PaginationOptions,
  ): Promise<ApplicationResult<ListFacilitiesResponse>> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 10));
    const skip = (page - 1) * limit;

    // Build filter
    const filter: Record<string, unknown> = { organizationId };
    if (options.status) {
      filter.status = options.status;
    }
    if (options.search) filter.name = { $regex: options.search, $options: "i" };

    // Determine sort
    let sort: Record<string, 1 | -1> = { createdAt: -1 };
    if (options.sort === "name") {
      sort = { name: 1 };
    } else if (options.sort === "createdAt") {
      sort = { createdAt: 1 };
    }

    // Get total count
    const total = await this.repository.count(filter);

    // Get paginated data
    const data = await this.repository.findManyWithSort(filter, sort, skip, limit);

    const pages = Math.ceil(total / limit);

    return {
      success: true,
      message: "Facilities retrieved successfully",
      data: facilityMapper.toPaginatedResponse(data, {
        page,
        limit,
        total,
        pages,
      }),
    };
  }

  async countByOrganization(organizationId: string): Promise<number> {
    return this.repository.count({ organizationId });
  }

  async statistics(
    organizationId: string,
  ): Promise<ApplicationResult<{ total: number; byStatus: Record<string, number> }>> {
    const [total, byStatus] = await Promise.all([
      this.repository.count({ organizationId }),
      this.repository.countByStatus(organizationId),
    ]);
    return {
      success: true,
      message: "Facility statistics retrieved successfully",
      data: { total, byStatus },
    };
  }

  // ─── Mutation Operations ───────────────────────────────────────────────────

  async create(
    facilityData: CreateFacilityInput,
    actor: JwtPayload,
  ): Promise<ApplicationResult<FacilityResponse>> {
    this.accessControl.requireOrganization(actor);

    // Verify actor's organization matches the facility's organization
    if (facilityData.organizationId !== actor.organizationId) {
      throw new AuthorizationException("You can only create facilities in your own organization");
    }

    // Check facility limit entitlement (optional: if subscription active)
    // This depends on business rules: should facilities be limited by plan?
    // For now, we'll check if organization has an active subscription
    let subscription: Awaited<ReturnType<BillingReader["findSubscriptionByOwner"]>> = null;
    try {
      subscription = await this.billingService.findSubscriptionByOwner(
        actor.organizationId,
        "organization",
      );
      // If subscription exists and is not active, reject
      if (subscription && subscription.status !== "active" && subscription.status !== "trial") {
        throw new BusinessException(
          "Facility creation requires an active subscription. Please upgrade your subscription.",
        );
      }
    } catch (error) {
      // Subscription not found is OK (free tier), but other errors should propagate
      if (error instanceof BusinessException) {
        throw error;
      }
      // For NotFoundException from findSubscriptionByOwner, we allow facility creation (free tier)
    }

    // Check facility count if there's a limit
    const facilityCount = await this.countByOrganization(actor.organizationId);
    // Every organization starts with one included Head Office. The free tier
    // can add one additional facility; paid tiers retain the larger ceiling.
    const MAX_FACILITIES_PER_ORG = !subscription || subscription.plan === "free" ? 2 : 100;
    if (facilityCount >= MAX_FACILITIES_PER_ORG) {
      throw new BusinessException(
        `Facility limit (${MAX_FACILITIES_PER_ORG}) reached for your organization`,
      );
    }

    const facility = await this.repository.create(facilityData, actor.userId);

    // Publish FacilityCreatedEvent
    await this.eventPublisher.publish(
      new FacilityCreatedEvent({
        facilityId: facility._id.toString(),
        organizationId: facility.organizationId.toString(),
        name: facility.name,
        address: facility.address,
        description: facility.description,
        managerName: facility.managerName,
        primaryPhone: facility.primaryPhone,
        emergencyContact: facility.emergencyContact,
        createdBy: facility.createdBy.toString(),
      }),
    );

    return {
      success: true,
      message: "Facility created successfully",
      data: facilityMapper.toResponse(facility),
    };
  }

  async update(
    facilityId: string,
    updateData: UpdateFacilityInput,
    actor: JwtPayload,
  ): Promise<ApplicationResult<FacilityResponse>> {
    this.accessControl.requireOrganization(actor);

    // Verify facility exists and belongs to actor's organization
    const facility = await this.repository.findById(facilityId);
    if (!facility) {
      throw new NotFoundException("Facility not found");
    }

    if (facility.organizationId.toString() !== actor.organizationId) {
      throw new AuthorizationException("You do not have access to update this facility");
    }

    const updated = await this.repository.update(facilityId, updateData, actor.userId);
    if (!updated) {
      throw new NotFoundException("Facility not found after update");
    }

    // Publish FacilityUpdatedEvent (omit nullable fields when null)
    const updatedPayload: FacilityUpdatedPayload = {
      facilityId: updated._id.toString(),
      organizationId: updated.organizationId.toString(),
      updatedBy: actor.userId,
    };

    if (updateData.name !== undefined) updatedPayload.name = updateData.name;
    if (updateData.address !== undefined) updatedPayload.address = updateData.address;
    if (updateData.description !== undefined && updateData.description !== null)
      updatedPayload.description = updateData.description;
    if (updateData.managerName !== undefined && updateData.managerName !== null)
      updatedPayload.managerName = updateData.managerName;
    if (updateData.primaryPhone !== undefined && updateData.primaryPhone !== null)
      updatedPayload.primaryPhone = updateData.primaryPhone;
    if (updateData.emergencyContact !== undefined && updateData.emergencyContact !== null)
      updatedPayload.emergencyContact = updateData.emergencyContact;
    if (updateData.status !== undefined) updatedPayload.status = updateData.status;

    await this.eventPublisher.publish(new FacilityUpdatedEvent(updatedPayload));

    return {
      success: true,
      message: "Facility updated successfully",
      data: facilityMapper.toResponse(updated),
    };
  }

  async deactivate(
    facilityId: string,
    actor: JwtPayload,
  ): Promise<ApplicationResult<FacilityResponse>> {
    this.accessControl.requireOrganization(actor);

    // Verify facility exists and belongs to actor's organization
    const facility = await this.repository.findById(facilityId);
    if (!facility) {
      throw new NotFoundException("Facility not found");
    }

    if (facility.organizationId.toString() !== actor.organizationId) {
      throw new AuthorizationException("You do not have access to deactivate this facility");
    }

    const updated = await this.repository.update(facilityId, { status: "inactive" }, actor.userId);

    if (!updated) {
      throw new NotFoundException("Facility not found after deactivation");
    }

    // Publish FacilityDeactivatedEvent
    await this.eventPublisher.publish(
      new FacilityDeactivatedEvent({
        facilityId: updated._id.toString(),
        organizationId: updated.organizationId.toString(),
        deactivatedBy: actor.userId,
      }),
    );

    return {
      success: true,
      message: "Facility deactivated successfully",
      data: facilityMapper.toResponse(updated),
    };
  }

  async delete(facilityId: string, actor: JwtPayload): Promise<ApplicationResult<void>> {
    this.accessControl.requireOrganization(actor);

    // Verify facility exists and belongs to actor's organization
    const facility = await this.repository.findById(facilityId);
    if (!facility) {
      throw new NotFoundException("Facility not found");
    }

    if (facility.organizationId.toString() !== actor.organizationId) {
      throw new AuthorizationException("You do not have access to delete this facility");
    }

    await this.repository.delete(facilityId);

    // Publish FacilityDeletedEvent
    await this.eventPublisher.publish(
      new FacilityDeletedEvent({
        facilityId: facility._id.toString(),
        organizationId: facility.organizationId.toString(),
        deletedBy: actor.userId,
      }),
    );

    return {
      success: true,
      message: "Facility deleted successfully",
      data: undefined,
    };
  }
}
