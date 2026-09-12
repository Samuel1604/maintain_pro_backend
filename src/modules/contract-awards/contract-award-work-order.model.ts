import { Schema, model, Document, Types } from "mongoose";

export interface IContractAwardWorkOrder extends Document {
  organizationId: Types.ObjectId;
  contractAwardId: Types.ObjectId;
  workOrderId: Types.ObjectId;
  associatedBy: Types.ObjectId;
  associatedAt: Date;
  removedAt?: Date;
}

const schema = new Schema<IContractAwardWorkOrder>({
  organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
  contractAwardId: { type: Schema.Types.ObjectId, ref: "ContractAward", required: true, index: true },
  workOrderId: { type: Schema.Types.ObjectId, ref: "WorkOrder", required: true, index: true },
  associatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  associatedAt: { type: Date, default: Date.now },
  removedAt: Date,
}, { timestamps: true });

schema.index({ contractAwardId: 1, workOrderId: 1 }, { unique: true });

export const ContractAwardWorkOrder = model<IContractAwardWorkOrder>("ContractAwardWorkOrder", schema);
