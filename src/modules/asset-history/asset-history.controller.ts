import { requestHandler } from "@/shared/utils/request.js";
import type { AuthRequest } from "@/shared/types/request.js";
import { listAssetHistorySchema } from "./asset-history.schema.js";
import { assetHistoryService } from "./asset-history.service.js";
export const listAssetHistory = requestHandler<AuthRequest<{ assetTag: string }>>(async (req, res) => { const result = await assetHistoryService.list(req.params.assetTag, req.user, listAssetHistorySchema.parse(req.query)); return res.ok(result.data, result.message); });
