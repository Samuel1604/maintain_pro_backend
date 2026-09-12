import { Organization } from "./organization.model.js";

import type { IOrganization } from "./organization.types.js";

import type { UpdateQuery, Types } from "mongoose";

export class OrganizationRepository {
  async create(data: Partial<IOrganization>): Promise<IOrganization> {
    return Organization.create(data);
  }

  async findById(
    organizationId: string | Types.ObjectId,
  ): Promise<IOrganization | null> {
    return Organization.findById(organizationId);
  }

  async findOne(filter: Partial<IOrganization>): Promise<IOrganization | null> {
    return Organization.findOne(filter);
  }

  async findMany(filter: Partial<IOrganization>): Promise<IOrganization[]> {
    return Organization.find(filter).limit(1000);
  }

  async update(
    organizationId: string | Types.ObjectId,

    updates: UpdateQuery<IOrganization>,
  ): Promise<IOrganization | null> {
    return Organization.findByIdAndUpdate(organizationId, updates, {
      returnDocument: "after",
    });
  }

  async delete(organizationId: string | Types.ObjectId): Promise<void> {
    await Organization.findByIdAndDelete(organizationId);
  }

  async count(filter: Partial<IOrganization>): Promise<number> {
    return Organization.countDocuments(filter);
  }

  async exists(filter: Partial<IOrganization>): Promise<boolean> {
    const result = await Organization.exists(filter);

    return Boolean(result);
  }
}
