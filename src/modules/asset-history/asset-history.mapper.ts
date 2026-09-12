import type { IAssetHistoryEntry } from "./asset-history.model.js";
import type { AssetHistoryResponse } from "./asset-history.dto.js";
export function toAssetHistoryResponse(entry: IAssetHistoryEntry): AssetHistoryResponse { return { id: entry._id.toString(), organizationId: entry.organizationId.toString(), assetId: entry.assetId.toString(), event: entry.event, description: entry.description, actorId: entry.actorId?.toString(), sourceType: entry.sourceType, sourceId: entry.sourceId?.toString(), data: entry.data, occurredAt: entry.occurredAt.toISOString() }; }
