import type { AssetHistoryEvent } from "./asset-history.types.js";
export interface AssetHistoryResponse { id: string; organizationId: string; assetId: string; event: AssetHistoryEvent; description?: string; actorId?: string; sourceType?: string; sourceId?: string; data?: Record<string, unknown>; occurredAt: string }
export interface AssetHistoryListResponse { data: AssetHistoryResponse[]; pagination: { page: number; limit: number; total: number; pages: number } }
