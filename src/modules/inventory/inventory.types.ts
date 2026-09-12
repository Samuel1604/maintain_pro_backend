export const INVENTORY_TRANSACTION_TYPES = {
  RECEIPT: "receipt",
  ISSUE: "issue",
  CONSUMPTION: "consumption",
  ADJUSTMENT: "adjustment",
  TRANSFER: "transfer",
  RETURN: "return",
  RESERVATION: "reservation",
  RELEASE: "release",
} as const;

export type InventoryTransactionType = typeof INVENTORY_TRANSACTION_TYPES[keyof typeof INVENTORY_TRANSACTION_TYPES];
export type InventoryStatus = "active" | "inactive";
export type ReservationStatus = "requested" | "reserved" | "consumed" | "released" | "rejected";
