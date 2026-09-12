import { Schema, model, Document, Types } from "mongoose";

export type OrganizationVendorMemberRole = "lead" | "manager" | "technician";
export type OrganizationVendorMemberStatus = "invited" | "active" | "suspended" | "removed";

export interface IOrganizationVendorMembership extends Document {
  organizationId: Types.ObjectId;
  userId: Types.ObjectId;
  role: OrganizationVendorMemberRole;
  status: OrganizationVendorMemberStatus;
  serviceCategories: string[];
  facilityIds: Types.ObjectId[];
  invitedBy: Types.ObjectId;
  joinedAt?: Date;
  suspendedAt?: Date;
  removedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<IOrganizationVendorMembership>({
  organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  role: { type: String, enum: ["lead", "manager", "technician"], required: true },
  status: { type: String, enum: ["invited", "active", "suspended", "removed"], default: "invited", index: true },
  serviceCategories: { type: [String], default: [] },
  facilityIds: [{ type: Schema.Types.ObjectId, ref: "Facility" }],
  invitedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  joinedAt: Date,
  suspendedAt: Date,
  removedAt: Date,
}, { timestamps: true });

schema.index({ organizationId: 1, userId: 1 }, { unique: true });
schema.index({ organizationId: 1, status: 1, role: 1 });

export const OrganizationVendorMembership = model<IOrganizationVendorMembership>("OrganizationVendorMembership", schema);
