import type { IServiceRequest } from "./request.model.js";
export interface ServiceRequestResponse {
  id: string;
  organizationId: string;
  facilityId: string;
  facilityName?: string;
  locationId: string;
  locationName?: string;
  assetId: string;
  assetName?: string;
  requestedBy: string;
  requesterName?: string;
  title: string;
  description: string;
  priority: IServiceRequest["priority"];
  serviceCategory: string;
  status: IServiceRequest["status"];
  workOrderId?: string;
  approvalDecision?: IServiceRequest["approvalDecision"];
  rejectionReason?: string;
  attachmentUploadIds?: string[];
  createdAt: string;
  updatedAt: string;
}
export function toServiceRequestResponse(item: IServiceRequest): ServiceRequestResponse {
  const facility = item.facilityId as unknown as { _id?: unknown; name?: string };
  const location = item.locationId as unknown as { _id?: unknown; name?: string };
  const asset = item.assetId as unknown as { _id?: unknown; name?: string };
  const requester = item.requestedBy as unknown as {
    _id?: unknown;
    firstName?: string;
    lastName?: string;
  };
  const referenceId = (value: unknown, populated: unknown) =>
    populated && typeof populated === "object" && "_id" in populated
      ? String((populated as { _id: unknown })._id)
      : String(value);
  return {
    id: item._id.toString(),
    organizationId: item.organizationId.toString(),
    facilityId: referenceId(item.facilityId, facility),
    facilityName: facility.name,
    locationId: referenceId(item.locationId, location),
    locationName: location.name,
    assetId: referenceId(item.assetId, asset),
    assetName: asset.name,
    requestedBy: referenceId(item.requestedBy, requester),
    requesterName: [requester.firstName, requester.lastName].filter(Boolean).join(" ") || undefined,
    title: item.title,
    description: item.description,
    priority: item.priority,
    serviceCategory: item.serviceCategory,
    status: item.status,
    workOrderId: item.workOrderId?.toString(),
    approvalDecision: item.approvalDecision,
    rejectionReason: item.rejectionReason,
    attachmentUploadIds: item.attachmentUploadIds?.map((id) => id.toString()),
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}
