import { NotFoundException } from "@/shared/errors/index.js";
import { PaymentMethod } from "./payment-method.model.js";
import type { PaymentMethodInput } from "./payment-method.schema.js";

type Owner = { ownerType: "organization" | "vendor"; ownerId: string };
export class PaymentMethodService {
  async get(owner: Owner) { return PaymentMethod.find({ ownerType: owner.ownerType, ownerId: owner.ownerId }).sort({ isDefault: -1, createdAt: 1 }).limit(20).lean(); }
  async upsert(input: PaymentMethodInput, owner: Owner) {
    const existing = await PaymentMethod.findOneAndUpdate(
      { ownerType: owner.ownerType, ownerId: owner.ownerId, providerPaymentMethodId: input.providerPaymentMethodId },
      { ...input, ownerType: owner.ownerType, ownerId: owner.ownerId, isDefault: true },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    await PaymentMethod.updateMany({ ownerType: owner.ownerType, ownerId: owner.ownerId, _id: { $ne: existing?._id } }, { $set: { isDefault: false } });
    return existing;
  }
  async remove(id: string, owner: Owner) {
    const deleted = await PaymentMethod.findOneAndDelete({ _id: id, ownerType: owner.ownerType, ownerId: owner.ownerId });
    if (!deleted) throw new NotFoundException("Payment method not found.");
    return { id };
  }
}
