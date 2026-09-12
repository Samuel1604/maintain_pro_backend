import { Router } from "express";
import { authMiddleware } from "@/shared/middleware/authenticate.js";
import { authorize } from "@/shared/middleware/authorize.js";
import { ROLES } from "@/shared/constants/roles.js";
import { Invoice } from "./invoice.model.js";
import { requestHandler } from "@/shared/utils/request.js";
import type { AuthRequest } from "@/shared/types/request.js";
import { z } from "zod";
import { BusinessException, ConflictException, NotFoundException } from "@/shared/errors/index.js";
import { eventPublisher } from "@/container/index.js";
import { BusinessFactEvent } from "@/infrastructure/events/business-fact.event.js";
import { invoicePdf } from "@/shared/utils/document-generation.js";
import { RedisCache } from "@/infrastructure/cache/redis.cache.js";
import { cacheKeys, cacheTtlSeconds } from "@/infrastructure/cache/cache-keys.js";
import { cacheHash } from "@/shared/utils/cache-hash.js";
const router = Router(); router.use(authMiddleware);
const invoiceCache = new RedisCache();
const invalidateInvoiceList = (organizationId?: string) => organizationId ? invoiceCache.delete(cacheKeys.invoiceList(organizationId, cacheHash({ scope: organizationId }))) : Promise.resolve();
router.get("/:id/pdf", authorize(ROLES.ADMIN, ROLES.FACILITY_MANAGER, ROLES.FINANCE), requestHandler<AuthRequest<{ id: string }>>(async (req, res) => {
  const invoice = await Invoice.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
  if (!invoice) throw new NotFoundException("Invoice not found");
  const file = await invoicePdf({ date: invoice.submittedAt?.toISOString().slice(0, 10) || "-", description: `Invoice ${invoice._id}`, amount: String(invoice.amount), status: invoice.status });
  res.set({ "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="invoice-${invoice._id}.pdf"` });
  return res.send(file);
}));
const review = z.object({ rejectionReason: z.string().min(3).optional(), externalPaymentReference: z.string().min(1).optional() });
router.get("/", authorize(ROLES.ADMIN, ROLES.FACILITY_MANAGER, ROLES.FINANCE), requestHandler<AuthRequest>(async (req, res) => {
  const scope = req.user.organizationId!; const key = cacheKeys.invoiceList(scope, cacheHash({ scope }));
  const cached = await invoiceCache.get<unknown[]>(key); if (cached) return res.ok(cached, "Invoices retrieved");
  const data = await Invoice.find({ organizationId: scope }).sort({ submittedAt: -1 }).limit(100).lean(); await invoiceCache.set(key, data, cacheTtlSeconds.invoice); return res.ok(data, "Invoices retrieved");
}));
router.patch("/:id/review", authorize(ROLES.ADMIN, ROLES.FINANCE), requestHandler<AuthRequest<{ id: string }>>(async (req, res) => {
  const body = review.parse(req.body); const status = body.rejectionReason ? "rejected" : "approved";
  const current = await Invoice.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
  if (!current) throw new NotFoundException("Invoice not found");
  if (!["submitted", "under_review"].includes(current.status)) throw new BusinessException("Only submitted or under-review invoices can be reviewed");
  const invoice = await Invoice.findOneAndUpdate({ _id: req.params.id, organizationId: req.user.organizationId, status: { $in: ["submitted", "under_review"] } }, { status, rejectionReason: body.rejectionReason, approvedBy: req.user.userId, approvedAt: new Date(), externalPaymentReference: body.externalPaymentReference }, { new: true });
  if (!invoice) throw new NotFoundException("Invoice not found"); await invalidateInvoiceList(req.user.organizationId); return res.ok(invoice, "Invoice review recorded");
}));
router.patch("/:id/paid", authorize(ROLES.ADMIN, ROLES.FINANCE), requestHandler<AuthRequest<{ id: string }>>(async (req, res) => {
  const body = z.object({ externalPaymentReference: z.string().min(1) }).parse(req.body);
  const current = await Invoice.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
  if (!current) throw new NotFoundException("Invoice not found");
  if (current.status === "paid") {
    if (current.externalPaymentReference === body.externalPaymentReference) return res.ok(current, "Invoice payment already recorded");
    throw new ConflictException("Invoice has already been paid with a different reference");
  }
  if (current.status !== "approved") throw new BusinessException("Only approved invoices can be marked paid");
  const invoice = await Invoice.findOneAndUpdate({ _id: req.params.id, organizationId: req.user.organizationId, status: "approved" }, { status: "paid", paidAt: new Date(), externalPaymentReference: body.externalPaymentReference }, { new: true });
  if (!invoice) throw new NotFoundException("Invoice not found"); await invalidateInvoiceList(req.user.organizationId); return res.ok(invoice, "Invoice payment recorded");
}));
router.patch("/:id/dispute", authorize(ROLES.ADMIN, ROLES.FINANCE, ROLES.VENDOR_LEAD, ROLES.VENDOR_MANAGER), requestHandler<AuthRequest<{ id: string }>>(async (req, res) => {
  const body = z.object({ reason: z.string().trim().min(3) }).parse(req.body);
  const isVendor = [ROLES.VENDOR_LEAD, ROLES.VENDOR_MANAGER].includes(req.user.role as typeof ROLES.VENDOR_LEAD | typeof ROLES.VENDOR_MANAGER);
  const filter = isVendor
    ? { _id: req.params.id, vendorId: req.user.vendorId }
    : { _id: req.params.id, organizationId: req.user.organizationId };
  const invoice = await Invoice.findOne(filter);
  if (!invoice) throw new NotFoundException("Invoice not found");
  if (!["submitted", "under_review", "approved"].includes(invoice.status)) throw new BusinessException("Invoice cannot be disputed in its current state");
  invoice.status = "disputed";
  invoice.disputeReason = body.reason;
  invoice.disputedAt = new Date();
  invoice.disputedBy = new (await import("mongoose")).Types.ObjectId(req.user.userId);
  await invoice.save();
  await eventPublisher.publish(new BusinessFactEvent("InvoiceDisputed", { invoiceId: invoice._id.toString(), reason: body.reason }, { organizationId: invoice.organizationId.toString(), vendorId: invoice.vendorId.toString(), actorId: req.user.userId, aggregateType: "invoice", aggregateId: invoice._id.toString() }));
  await invalidateInvoiceList(invoice.organizationId.toString());
  return res.ok(invoice, "Invoice disputed");
})); export default router;
