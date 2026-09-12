import { describe, expect, it } from "vitest";
import { PreventiveMaintenanceOccurrenceLinkedToWorkOrderEvent, PreventiveMaintenancePlanCreatedEvent } from "@/modules/preventive-maintenance/events/pm.events.js";

describe("Preventive Maintenance domain events", () => {
  it("uses the stable plan aggregate contract and tenant metadata", () => {
    const event = new PreventiveMaintenancePlanCreatedEvent(
      { planId: "plan-1", facilityId: "facility-1", status: "approved" },
      { organizationId: "org-1", actorId: "user-1", aggregateType: "preventive_maintenance_plan", aggregateId: "plan-1", correlationId: "corr-1", causationId: "cause-1" },
    );
    expect(event.name).toBe("PreventiveMaintenancePlanCreated");
    expect(event.version).toBe(1);
    expect(event.organizationId).toBe("org-1");
    expect(event.aggregateId).toBe("plan-1");
    expect(event.correlationId).toBe("corr-1");
    expect(event.causationId).toBe("cause-1");
    expect(event.payload).not.toHaveProperty("occurrenceStatus");
  });

  it("keeps Work Order traceability on the occurrence event", () => {
    const event = new PreventiveMaintenanceOccurrenceLinkedToWorkOrderEvent(
      { planId: "plan-1", occurrenceId: "occ-1", workOrderId: "wo-1" },
      { organizationId: "org-1", aggregateType: "preventive_maintenance_occurrence", aggregateId: "occ-1" },
    );
    expect(event.name).toBe("PreventiveMaintenanceOccurrenceLinkedToWorkOrder");
    expect(event.payload).toEqual({ planId: "plan-1", occurrenceId: "occ-1", workOrderId: "wo-1" });
    expect(event.aggregateType).toBe("preventive_maintenance_occurrence");
  });
});
