import { Schema, model, type Document, type Types } from "mongoose";
export interface IFacilityVendor extends Document { organizationId: Types.ObjectId; facilityId: Types.ObjectId; vendorId: Types.ObjectId; createdBy: Types.ObjectId; createdAt: Date; updatedAt: Date }
const schema = new Schema<IFacilityVendor>({ organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true }, facilityId: { type: Schema.Types.ObjectId, ref: "Facility", required: true }, vendorId: { type: Schema.Types.ObjectId, ref: "Vendor", required: true }, createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true } }, { timestamps: true });
schema.index({ facilityId: 1, vendorId: 1 }, { unique: true });
export const FacilityVendor = model<IFacilityVendor>("FacilityVendor", schema);
