import { requestHandler } from "@/shared/utils/request.js";
import type { AuthRequest } from "@/shared/types/request.js";
import { InventoryService } from "./inventory.service.js";
import { createCategorySchema, createItemSchema, createStockLocationSchema, issueSchema, receiveSchema, reserveSchema, adjustSchema, releaseSchema, updateItemSchema, updateStockLocationSchema, transferSchema, returnSchema } from "./inventory.schema.js";

const service = new InventoryService();

export const listItems = requestHandler<AuthRequest>(async (req, res) => res.ok(await service.listItems(req.user, typeof req.query.search === "string" ? req.query.search : undefined), "Inventory items retrieved"));
export const createItem = requestHandler<AuthRequest>(async (req, res) => res.created((await service.createItem(createItemSchema.parse(req.body), req.user)).data, "Inventory item created"));
export const updateItem = requestHandler<AuthRequest<{ id: string }>>(async (req, res) => res.ok((await service.updateItem(req.params.id, updateItemSchema.parse(req.body), req.user)).data, "Inventory item updated"));
export const deactivateItem = requestHandler<AuthRequest<{ id: string }>>(async (req, res) => res.ok((await service.deactivateItem(req.params.id, req.user)).data, "Inventory item deactivated"));
export const listCategories = requestHandler<AuthRequest>(async (req, res) => res.ok(await service.categories(req.user), "Inventory categories retrieved"));
export const createCategory = requestHandler<AuthRequest>(async (req, res) => { const data = createCategorySchema.parse(req.body); return res.created(await service.createCategory(data.name, data.description, req.user), "Inventory category created"); });
export const listLocations = requestHandler<AuthRequest>(async (req, res) => res.ok(await service.locations(req.user), "Stock locations retrieved"));
export const createLocation = requestHandler<AuthRequest>(async (req, res) => res.created(await service.createLocation(createStockLocationSchema.parse(req.body), req.user), "Stock location created"));
export const updateLocation = requestHandler<AuthRequest<{ id: string }>>(async (req, res) => res.ok(await service.updateLocation(req.params.id, updateStockLocationSchema.parse(req.body), req.user), "Stock location updated"));
export const deactivateLocation = requestHandler<AuthRequest<{ id: string }>>(async (req, res) => res.ok(await service.deactivateLocation(req.params.id, req.user), "Stock location deactivated"));
export const balances = requestHandler<AuthRequest>(async (req, res) => res.ok(await service.balances(req.user, typeof req.query.itemId === "string" ? req.query.itemId : undefined, typeof req.query.stockLocationId === "string" ? req.query.stockLocationId : undefined), "Stock balances retrieved"));
export const receive = requestHandler<AuthRequest>(async (req, res) => res.created(await service.receive(receiveSchema.parse(req.body), req.user), "Stock received"));
export const reserve = requestHandler<AuthRequest>(async (req, res) => res.created(await service.reserve(reserveSchema.parse(req.body), req.user), "Stock reserved"));
export const release = requestHandler<AuthRequest>(async (req, res) => res.ok(await service.release(releaseSchema.parse(req.body).reservationId, req.user), "Reservation released"));
export const issue = requestHandler<AuthRequest>(async (req, res) => res.created(await service.issue(issueSchema.parse(req.body), req.user), "Stock issued"));
export const consume = requestHandler<AuthRequest>(async (req, res) => res.created(await service.issue(issueSchema.parse(req.body), req.user, "consumption"), "Stock consumed"));
export const adjust = requestHandler<AuthRequest>(async (req, res) => res.created(await service.adjust(adjustSchema.parse(req.body), req.user), "Stock adjusted"));
export const transfer = requestHandler<AuthRequest>(async (req, res) => res.created(await service.transfer(transferSchema.parse(req.body), req.user), "Stock transferred"));
export const returnStock = requestHandler<AuthRequest>(async (req, res) => res.created(await service.returnStock(returnSchema.parse(req.body), req.user), "Stock returned"));
export const history = requestHandler<AuthRequest>(async (req, res) => res.ok(await service.history(req.user, typeof req.query.itemId === "string" ? req.query.itemId : undefined, typeof req.query.stockLocationId === "string" ? req.query.stockLocationId : undefined, typeof req.query.workOrderId === "string" ? req.query.workOrderId : undefined), "Inventory history retrieved"));
export const overview = requestHandler<AuthRequest>(async (req, res) => res.ok(await service.overview(req.user), "Inventory overview retrieved"));
export const reconcile = requestHandler<AuthRequest>(async (req, res) => res.ok(await service.reconcile(req.user), "Inventory reconciliation completed"));
