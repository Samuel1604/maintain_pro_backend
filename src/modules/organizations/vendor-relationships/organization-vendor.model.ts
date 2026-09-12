import { Schema, model, type Document, type Types } from "mongoose";
export type VendorRelationshipStatus =
  | "pending"
  | "active"
  | "suspended"
  | "inactive"
  | "removed";
export interface IVendorOrganization extends Document {
  organizationId: Types.ObjectId;
  vendorId: Types.ObjectId;
  status: VendorRelationshipStatus;
  createdBy: Types.ObjectId;
  activatedBy?: Types.ObjectId;
  activatedAt?: Date;
  suspendedBy?: Types.ObjectId;
  suspendedAt?: Date;
  removedBy?: Types.ObjectId;
  removedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
const schema = new Schema<IVendorOrganization>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    vendorId: { type: Schema.Types.ObjectId, ref: "Vendor", required: true },
    status: {
      type: String,
      enum: ["pending", "active", "suspended", "inactive", "removed"],
      default: "pending",
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    activatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    activatedAt: Date,
    suspendedBy: { type: Schema.Types.ObjectId, ref: "User" },
    suspendedAt: Date,
    removedBy: { type: Schema.Types.ObjectId, ref: "User" },
    removedAt: Date,
  },
  { timestamps: true },
);
schema.index({ organizationId: 1, vendorId: 1 }, { unique: true });
export const OrganizationVendorRelationship = model<IVendorOrganization>(
  "OrganizationVendorRelationship",
  schema,
);
