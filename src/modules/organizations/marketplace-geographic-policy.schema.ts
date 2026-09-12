import { z } from "zod";
export const geographicPolicySchema = z.object({ priority: z.enum(["low", "medium", "high", "critical"]), maxDistanceKm: z.number().finite().nonnegative(), enabled: z.boolean().default(true) });
export const geographicPolicyUpdateSchema = geographicPolicySchema.partial();
export type GeographicPolicyInput = z.infer<typeof geographicPolicySchema>; export type GeographicPolicyUpdateInput = z.infer<typeof geographicPolicyUpdateSchema>;
