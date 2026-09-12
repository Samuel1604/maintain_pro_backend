import { z } from "zod";
import { ASSET_HISTORY_EVENTS } from "./asset-history.types.js";
export const listAssetHistorySchema = z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20), event: z.enum(ASSET_HISTORY_EVENTS).optional(), from: z.coerce.date().optional(), to: z.coerce.date().optional() });
