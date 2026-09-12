import { Vendor } from "./vendor.model.js";
import type { IVendor } from "./vendor.types.js";
import type { UpdateQuery, Types } from "mongoose";

export class VendorRepository {
  async create(data: Partial<IVendor>): Promise<IVendor> {
    return Vendor.create(data);
  }

  async findById(vendorId: string | Types.ObjectId): Promise<IVendor | null> {
    return Vendor.findById(vendorId);
  }

  async findOne(filter: Partial<IVendor>): Promise<IVendor | null> {
    return Vendor.findOne(filter);
  }

  async findMany(filter: Partial<IVendor>): Promise<IVendor[]> {
    return Vendor.find(filter).limit(1000);
  }

  async update(
    vendorId: string | Types.ObjectId,

    updates: UpdateQuery<IVendor>,
  ): Promise<IVendor | null> {
    return Vendor.findByIdAndUpdate(vendorId, updates, {
      returnDocument: "after",
    });
  }

  async delete(vendorId: string | Types.ObjectId): Promise<void> {
    await Vendor.findByIdAndDelete(vendorId);
  }

  async count(filter: Partial<IVendor>): Promise<number> {
    return Vendor.countDocuments(filter);
  }

  async exists(filter: Partial<IVendor>): Promise<boolean> {
    const result = await Vendor.exists(filter);

    return Boolean(result);
  }
}
