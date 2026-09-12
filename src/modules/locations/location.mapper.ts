import type { ILocation } from "./location.model.js";

export interface LocationResponse {
  id: string;
  organizationId: string;
  facilityId: string;
  parentId?: string;
  name: string;
  type: ILocation["type"];
  code?: string;
  floor?: string;
  roomNumber?: string;
  description?: string;
  status: ILocation["status"];
  createdAt: string;
  updatedAt: string;
}

export function toLocationResponse(location: ILocation): LocationResponse {
  return { id: location._id.toString(), organizationId: location.organizationId.toString(), facilityId: location.facilityId.toString(), parentId: location.parentId?.toString(), name: location.name, type: location.type, code: location.code, floor: location.floor, roomNumber: location.roomNumber, description: location.description, status: location.status, createdAt: location.createdAt.toISOString(), updatedAt: location.updatedAt.toISOString() };
}
