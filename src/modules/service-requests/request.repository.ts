import { ServiceRequest } from "./request.model.js";

export class ServiceRequestRepository {
  create(data: Record<string, unknown>) {
    return ServiceRequest.create(data);
  }

  findById(id: string) {
    return ServiceRequest.findById(id);
  }
}
