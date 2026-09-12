import { z } from "zod";

export const paymentMethodSchema = z.object({
  provider: z.string().trim().min(1).max(40),
  providerPaymentMethodId: z.string().trim().min(1).max(200),
  brand: z.string().trim().min(1).max(30),
  last4: z.string().regex(/^\d{4}$/, "Last four digits must contain exactly four numbers"),
  expMonth: z.coerce.number().int().min(1).max(12),
  expYear: z.coerce.number().int().min(new Date().getFullYear()),
});
export type PaymentMethodInput = z.infer<typeof paymentMethodSchema>;
