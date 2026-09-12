import PDFDocument from "pdfkit";
import QRCode from "qrcode";

export async function assetQrPng(value: string): Promise<Buffer> {
  return QRCode.toBuffer(value, { type: "png", width: 900, margin: 2, errorCorrectionLevel: "M" });
}

export async function assetPdf(asset: Record<string, unknown>): Promise<Buffer> {
  const tag = String(asset.assetTag);
  const qr = await assetQrPng(String(asset.qrCode || `maintainpro://assets/${encodeURIComponent(tag)}`));
  const doc = new PDFDocument({ size: "A4", margin: 48 });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));
  doc.rect(0, 0, 595, 96).fill("#172554");
  doc.fillColor("white").fontSize(22).text("MaintainPro", 48, 28);
  doc.fontSize(11).text("Asset record", 48, 60);
  doc.fillColor("#111827").fontSize(22).text(String(asset.name || tag), 48, 130);
  doc.fillColor("#6b7280").fontSize(10).text(`Asset ID: ${tag}`, 48, 160);
  doc.image(qr, 410, 118, { width: 125 });
  doc.fillColor("#111827").fontSize(13).text("Asset details", 48, 210);
  const rows: Array<[string, unknown]> = [["Category", asset.category], ["Manufacturer", asset.manufacturer], ["Model number", asset.modelNumber], ["Serial number", asset.serialNumber], ["Location", asset.locationId], ["Status", asset.status], ["Warranty expiry", asset.warrantyExpiry]];
  let y = 238;
  for (const [label, value] of rows) {
    doc.fillColor("#6b7280").fontSize(10).text(label, 48, y);
    doc.fillColor("#111827").text(value ? String(value) : "-", 220, y);
    doc.strokeColor("#e5e7eb").moveTo(48, y + 18).lineTo(547, y + 18).stroke();
    y += 30;
  }
  doc.fillColor("#6b7280").fontSize(8).text(`Generated ${new Date().toLocaleString()}`, 48, 790);
  doc.end();
  return done;
}

export function invoicePdf(invoice: Record<string, unknown>): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margin: 48 });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));
  doc.rect(0, 0, 595, 100).fill("#172554");
  doc.fillColor("white").fontSize(22).text("MaintainPro", 48, 30);
  doc.fontSize(11).text("Subscription invoice", 48, 63);
  doc.fillColor("#111827").fontSize(22).text("Invoice", 48, 145);
  doc.fillColor("#6b7280").fontSize(10).text(`Billing date: ${String(invoice.date)}`, 48, 175);
  doc.fillColor("#111827").fontSize(12).text(String(invoice.description), 48, 225, { width: 500 });
  doc.fillColor("#6b7280").fontSize(10).text("Amount", 48, 285).text("Status", 300, 285);
  doc.fillColor("#111827").fontSize(15).text(String(invoice.amount), 48, 305).text(String(invoice.status), 300, 305);
  doc.fillColor("#6b7280").fontSize(8).text("Thank you for using MaintainPro.", 48, 790);
  doc.end();
  return done;
}
