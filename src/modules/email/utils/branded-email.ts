import type { EmailLayoutVariant } from "../types/communication.types.js";

const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char,
  );
export function renderBrandedEmail(input: {
  title: string;
  body: string;
  preheader?: string;
  action?: { label: string; url: string };
  variant?: EmailLayoutVariant;
  organizationName?: string;
}): string {
  const accent = input.variant === "alert" ? "#dc2626" : "#2563eb";
  const action = input.action
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 8px"><tr><td bgcolor="${accent}" style="border-radius:4px"><a href="${escape(input.action.url)}" style="display:inline-block;padding:12px 24px;color:#fff;text-decoration:none;font-size:14px;font-weight:600;line-height:20px">${escape(input.action.label)}</a></td></tr></table>`
    : "";
  const context = input.organizationName
    ? `<p style="margin:0 0 24px;color:#6b7280;font-size:13px;line-height:18px">Workspace: <strong style="color:#111827">${escape(input.organizationName)}</strong></p>`
    : "";
  const logoUrl =
    process.env.EMAIL_LOGO_URL ||
    `${process.env.FRONTEND_URL || process.env.CLIENT_URL || "http://localhost:3000"}/logo-light.png`;
  const logo = `<img src="${escape(logoUrl)}" width="146" alt="MaintainPro" style="display:block;width:146px;height:auto;max-height:34px;object-fit:contain;object-position:left center" />`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(input.title)}</title><style>body{margin:0;background:#f5f7fa;color:#111827;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}a{color:${accent}}@media(max-width:620px){.frame{padding:16px!important}.content{padding:28px 22px!important}.header{padding:20px 22px!important}.footer{padding:20px 22px 26px!important}}</style></head><body><div style="display:none;max-height:0;overflow:hidden;opacity:0">${escape(input.preheader ?? input.title)}&nbsp;&zwnj;</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="frame" align="center" style="padding:40px 16px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#fff;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden"><tr><td class="header" style="padding:24px 32px 16px;background:#fff;border-bottom:1px solid #e5e7eb"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td>${logo}</td><td align="right" style="font-size:12px;line-height:16px;color:#6b7280">MaintainPro</td></tr></table></td></tr><tr><td class="content" style="padding:32px;background:#fff"><div style="width:42px;height:4px;border-radius:4px;background:${accent};margin-bottom:20px"></div><h1 style="margin:0 0 12px;color:#111827;font-size:24px;line-height:32px;letter-spacing:-.36px">${escape(input.title)}</h1>${context}<div style="color:#4b5563;font-size:15px;line-height:24px">${input.body}</div>${action}<p style="margin:24px 0 0;color:#6b7280;font-size:12px;line-height:16px">If the button does not work, copy and paste the link from this email into your browser.</p></td></tr><tr><td class="footer" style="padding:24px 32px 28px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center"><p style="margin:0 0 8px;color:#111827;font-size:13px;line-height:18px;font-weight:600">MaintainPro</p><p style="margin:0;color:#6b7280;font-size:12px;line-height:16px">Reliable maintenance operations for organizations and service providers.</p><p style="margin:12px 0 0;color:#9ca3af;font-size:12px;line-height:16px">This is an automated message. Please do not reply directly.</p></td></tr></table></td></tr></table></body></html>`;
}
