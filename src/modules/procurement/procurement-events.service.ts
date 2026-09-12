import { eventPublisher } from "@/container/index.js";
import { BusinessFactEvent } from "@/infrastructure/events/business-fact.event.js";
import type { AuditAction } from "@/modules/audit/audit.types.js";

export class ProcurementEventsService {
  async auditEvent(input: {
    action: AuditAction;
    actorId: string;
    organizationId: string;
    entityId: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    const eventName = ({ application_submitted: "VendorApplicationSubmitted", quotation_submitted: "QuotationSubmitted", quotation_revision_created: "QuotationRevisionCreated", award_created: "ContractAwardCreated", award_activated: "ContractAwardActivated", award_terminated: "ContractAwardTerminated", sla_proposed: "SLAProposed" } as Record<string, string>)[input.action.replace("procurement.", "")] ?? input.action;
    await eventPublisher.publish(new BusinessFactEvent(eventName, { ...input.metadata, entityId: input.entityId, action: input.action }, { organizationId: input.organizationId, actorId: input.actorId, aggregateType: "procurement", aggregateId: input.entityId }));
  }

  async notifyOrganization(
    organizationId: string,
    actorId: string,
    resourceId: string,
    title: string,
    message: string,
  ): Promise<void> {
    await eventPublisher.publish(new BusinessFactEvent("ProcurementNotificationRequested", { organizationId, actorId, resourceId, title, message, audience: "organization" }, { organizationId, actorId, aggregateType: "procurement", aggregateId: resourceId }));
  }

  async notifyVendor(
    vendorId: string,
    actorId: string,
    organizationId: string,
    resourceId: string,
    title: string,
    message: string,
  ): Promise<void> {
    await eventPublisher.publish(new BusinessFactEvent("ProcurementNotificationRequested", { vendorId, organizationId, actorId, resourceId, title, message, audience: "vendor" }, { organizationId, actorId, aggregateType: "procurement", aggregateId: resourceId }));
  }
}
