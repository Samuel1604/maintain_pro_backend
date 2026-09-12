import { Schema, model, type Document, type Types } from "mongoose";

export interface IWorkOrderComment extends Document {
  organizationId: Types.ObjectId;
  workOrderId: Types.ObjectId;
  authorId: Types.ObjectId;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<IWorkOrderComment>({
  organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
  workOrderId: { type: Schema.Types.ObjectId, ref: "WorkOrder", required: true, index: true },
  authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  content: { type: String, required: true, trim: true, maxlength: 5000 },
}, { timestamps: true });

export const WorkOrderComment = model<IWorkOrderComment>("WorkOrderComment", schema);
