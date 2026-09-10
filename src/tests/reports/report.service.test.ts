import { describe, expect, it, vi, afterEach } from "vitest";
import { WorkOrder } from "@/modules/work-orders/work-order.model.js";
import { ServiceRequest } from "@/modules/service-requests/request.model.js";
import { ReportService } from "@/modules/reports/report.service.js";
import { SlaAgreement } from "@/modules/sla-agreements/sla-agreement.model.js";

describe("ReportService dashboard scoping", () => {
  afterEach(() => vi.restoreAllMocks());

  it("scopes vendor dashboards by vendor assignment without organization context", async () => {
    const count = vi.spyOn(WorkOrder, "countDocuments")
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(2);

    const result = await new ReportService().dashboard(
      {} as never,
      { userId: "user-1", role: "vendor_lead", vendorId: "vendor-1" },
    );

    expect(result.summary).toEqual({
      totalWorkOrders: 3,
      completedWorkOrders: 1,
      openWorkOrders: 2,
    });
    expect(count.mock.calls).toEqual([
      [{ assignedVendorId: "vendor-1" }],
      [{ assignedVendorId: "vendor-1", status: "completed" }],
      [{ assignedVendorId: "vendor-1", status: { $nin: ["completed", "cancelled"] } }],
    ]);
  });

  it("scopes staff dashboards to requests submitted by the staff user", async () => {
    const count = vi.spyOn(ServiceRequest, "countDocuments")
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1);

    const result = await new ReportService().dashboard(
      {} as never,
      { userId: "user-2", role: "staff", organizationId: "org-1" },
    );

    expect(result.summary).toEqual({
      totalServiceRequests: 4,
      pendingServiceRequests: 2,
      approvedServiceRequests: 1,
    });
    expect(count.mock.calls).toEqual([
      [{ organizationId: "org-1", requestedBy: "user-2" }],
      [{ organizationId: "org-1", requestedBy: "user-2", status: "pending" }],
      [{ organizationId: "org-1", requestedBy: "user-2", status: "approved" }],
    ]);
  });

  it("scopes technician dashboards to assigned work orders and organization", async () => {
    const count = vi.spyOn(WorkOrder, "countDocuments")
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(2);

    const result = await new ReportService().dashboard(
      {} as never,
      { userId: "tech-1", role: "technician", organizationId: "org-1" },
    );

    expect(result.summary).toEqual({ totalWorkOrders: 5, completedWorkOrders: 3, openWorkOrders: 2 });
    expect(count.mock.calls).toEqual([
      [{ organizationId: "org-1", assignedTechnicianId: "tech-1" }],
      [{ organizationId: "org-1", assignedTechnicianId: "tech-1", status: "completed" }],
      [{ organizationId: "org-1", assignedTechnicianId: "tech-1", status: { $nin: ["completed", "cancelled"] } }],
    ]);
  });

  it("rejects vendor dashboards without vendor context", async () => {
    await expect(new ReportService().dashboard(
      {} as never,
      { userId: "user-3", role: "vendor_manager" },
    )).rejects.toThrow("Vendor reporting context is required");
  });

  it("aggregates vendor performance in MongoDB instead of loading work orders", async () => {
    const aggregate = vi.spyOn(WorkOrder, "aggregate").mockResolvedValue([
      {
        _id: "vendor-1",
        assignedWorkOrders: 4,
        completedWorkOrders: 3,
        onTimeWorkOrders: 2,
        vendor: { name: "Acme Facilities", averageRating: 4.5 },
      },
    ] as never);

    const result = await new ReportService().vendorPerformance(
      {
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-01-31"),
        page: 1,
        pageSize: 25,
        sortBy: "createdAt",
        sortOrder: "desc",
      } as never,
      { userId: "admin-1", role: "admin", organizationId: "org-1" },
    );

    expect(result.vendors[0]).toMatchObject({
      vendorId: "vendor-1",
      assignedWorkOrders: 4,
      completedWorkOrders: 3,
      onTimeWorkOrders: 2,
      completionRate: 75,
      onTimeRate: 66.67,
    });
    expect(aggregate).toHaveBeenCalledOnce();
    expect(aggregate.mock.calls[0]?.[0]).toEqual(expect.arrayContaining([
      expect.objectContaining({ $group: expect.any(Object) }),
      expect.objectContaining({ $lookup: expect.any(Object) }),
    ]));
  });

  it("aggregates SLA compliance in MongoDB instead of loading agreements into Node", async () => {
    const aggregate = vi.spyOn(SlaAgreement, "aggregate").mockResolvedValue([
      {
        _id: "vendor-1",
        agreements: 2,
        activeAgreements: 1,
        completed: 2,
        compliant: 1,
        breaches: 1,
        vendor: { name: "Acme Facilities" },
      },
    ] as never);

    const result = await new ReportService().slaCompliance(
      {
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-01-31"),
        page: 1,
        pageSize: 25,
        sortBy: "createdAt",
        sortOrder: "desc",
      } as never,
      { userId: "admin-1", role: "admin", organizationId: "org-1" },
    );

    expect(result).toMatchObject({
      totalAgreements: 2,
      activeAgreements: 1,
      completedWorkOrders: 2,
      compliantWorkOrders: 1,
      breaches: 1,
      complianceRate: 50,
    });
    expect(result.vendors[0]).toMatchObject({ vendorId: "vendor-1", complianceRate: 50 });
    expect(aggregate).toHaveBeenCalledOnce();
    expect(aggregate.mock.calls[0]?.[0]).toEqual(expect.arrayContaining([
      expect.objectContaining({ $group: expect.any(Object) }),
      expect.objectContaining({ $lookup: expect.any(Object) }),
    ]));
  });
});
