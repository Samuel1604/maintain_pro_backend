import type { EmailProvider } from "../interfaces/email-provider.interface.js";
import type {
  SendEmailPayload,
  SendEmailResult,
  VerificationEmailPayload,
  PasswordResetEmailPayload,
  InvitationEmailPayload,
  TemporaryInvitationEmailPayload,
} from "../types/email.types.js";
import { LoggerService } from "@/infrastructure/logging/logger.service.js";
import { renderBrandedEmail } from "../utils/branded-email.js";
import { EMAIL_TEMPLATES } from "../templates/email.templates.js";
import type { EmailTemplateId } from "../templates/email.templates.js";

function formatLoginDevice(userAgent?: string): string | undefined {
  if (!userAgent) return undefined;

  const browser = userAgent.includes("Edg/")
    ? "Edge"
    : userAgent.includes("OPR/") || userAgent.includes("Opera")
      ? "Opera"
      : userAgent.includes("Firefox/")
        ? "Firefox"
        : userAgent.includes("Chrome/")
          ? "Chrome"
          : userAgent.includes("Safari/")
            ? "Safari"
            : userAgent.includes("MSIE") || userAgent.includes("Trident/")
              ? "Internet Explorer"
              : "Web browser";

  const operatingSystem =
    userAgent.includes("iPhone") || userAgent.includes("iPad")
      ? "iOS"
      : userAgent.includes("Android")
        ? "Android"
        : userAgent.includes("Windows NT")
          ? "Windows"
          : userAgent.includes("Mac OS X")
            ? "macOS"
            : userAgent.includes("Linux")
              ? "Linux"
              : undefined;

  return operatingSystem ? `${browser} on ${operatingSystem}` : browser;
}

export class EmailService {
  private readonly frontendUrl: string;

  constructor(
    private readonly provider: EmailProvider,
    private readonly logger?: LoggerService,
  ) {
    this.frontendUrl =
      process.env.FRONTEND_URL || process.env.CLIENT_URL || "http://localhost:3000";
  }

  /**
   * Generic low-level send method for internal email module use.
   */
  async send(payload: SendEmailPayload): Promise<SendEmailResult> {
    this.logger?.info("Executing email send request", {
      provider: this.provider.providerName,
      subject: payload.subject,
      recipient: payload.to,
      correlationId: payload.correlationId,
    });

    try {
      const result = await this.provider.sendEmail(payload);
      return result;
    } catch (error) {
      this.logger?.error("Email dispatch failed", {
        provider: this.provider.providerName,
        subject: payload.subject,
        correlationId: payload.correlationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async sendTemplate(input: {
    to: SendEmailPayload["to"];
    templateId: EmailTemplateId;
    body: string;
    text?: string;
    variables?: Record<string, unknown>;
    action?: { label: string; url: string };
    organizationName?: string;
    correlationId?: string;
  }): Promise<SendEmailResult> {
    const template = Object.values(EMAIL_TEMPLATES).find((item) => item.id === input.templateId);
    if (!template) throw new Error(`Unknown email template: ${input.templateId}`);
    return this.send({
      to: input.to,
      subject: template.subject,
      tags: [template.id, `template-v${template.version}`],
      correlationId: input.correlationId,
      html: renderBrandedEmail({
        title: template.title,
        preheader: template.preheader,
        variant: template.variant,
        body: input.body,
        action: input.action,
        organizationName: input.organizationName,
      }),
      text: input.text ?? input.body.replace(/<[^>]+>/g, ""),
      metadata: {
        templateId: template.id,
        templateVersion: String(template.version),
        ...Object.fromEntries(
          Object.entries(input.variables ?? {}).map(([key, value]) => [key, String(value)]),
        ),
      },
    });
  }

  /**
   * Business API: Send verification email with OTP / Token link.
   */
  async sendVerificationEmail(payload: VerificationEmailPayload): Promise<SendEmailResult> {
    return this.send({
      to: { email: payload.email, name: payload.name },
      subject: EMAIL_TEMPLATES.verification.subject,
      tags: [EMAIL_TEMPLATES.verification.id, "auth"],
      correlationId: payload.correlationId,
      html: renderBrandedEmail({
        title: "Verify your MaintainPro account",
        preheader: "Your MaintainPro verification code",
        variant: "security",
        body: `<p style="margin:0 0 20px">Hello ${payload.name || "there"},</p><p style="margin:0 0 20px">Use the verification code below to confirm your email address and complete your account setup.</p><div style="margin:24px 0;padding:18px 16px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;text-align:center"><div style="margin:0 0 6px;color:#1d4ed8;font-size:11px;line-height:16px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase">Verification code</div><div style="color:#111827;font-size:32px;line-height:40px;font-weight:700;letter-spacing:8px">${payload.tokenOrOtp}</div></div><p style="margin:0 0 16px;color:#6b7280;font-size:13px;line-height:20px">This code expires in <strong style="color:#111827">10 minutes</strong>.</p><div style="margin-top:20px;padding:14px 16px;background:#f9fafb;border-left:3px solid #2563eb;color:#6b7280;font-size:13px;line-height:20px">If you did not create a MaintainPro account, you can safely ignore this email.</div>`,
      }),
      text: `Hello ${payload.name || "there"},\n\nYour MaintainPro verification code is: ${payload.tokenOrOtp}\n\nThis code expires in 10 minutes.\n\nIf you did not create a MaintainPro account, you can safely ignore this email.`,
    });
  }

  /**
   * Business API: Send password reset email with token link.
   */
  async sendPasswordResetEmail(payload: PasswordResetEmailPayload): Promise<SendEmailResult> {
    const resetLink = `${this.frontendUrl}/reset-password?token=${encodeURIComponent(payload.resetToken)}`;

    return this.send({
      to: { email: payload.email, name: payload.name },
      subject: EMAIL_TEMPLATES.passwordReset.subject,
      tags: [EMAIL_TEMPLATES.passwordReset.id, "auth"],
      correlationId: payload.correlationId,
      html: renderBrandedEmail({
        title: "Reset your password",
        variant: "security",
        body: `<p>Hello ${payload.name || "there"},</p><p>We received a request to reset your MaintainPro password.</p><p style="font-size:12px;color:#64748b">If you did not request this, you can safely ignore this email.</p>`,
        action: { label: "Reset password", url: resetLink },
      }),
      text: `Hello ${payload.name || "there"},\n\nReset your password using link: ${resetLink}`,
    });
  }

  /**
   * Business API: Send invitation email for organizations / vendors.
   */
  async sendInvitationEmail(payload: InvitationEmailPayload): Promise<SendEmailResult> {
    const inviteLink = `${this.frontendUrl}/accept-invite?token=${encodeURIComponent(payload.invitationToken)}`;

    return this.send({
      to: { email: payload.email, name: payload.name },
      subject: `${EMAIL_TEMPLATES.invitation.subject}${payload.organizationName ? ` · ${payload.organizationName}` : ""}`,
      tags: [EMAIL_TEMPLATES.invitation.id, "onboarding"],
      correlationId: payload.correlationId,
      html: renderBrandedEmail({
        title: "You are invited to MaintainPro",
        preheader: `Join ${payload.organizationName || "your workspace"}`,
        variant: "action_required",
        organizationName: payload.organizationName,
        body: `<p>Hello ${payload.name || "there"},</p><p>You have been invited to join <strong>${payload.organizationName || "MaintainPro"}</strong> as <strong>${payload.role || "Team Member"}</strong>.</p>`,
        action: { label: "Accept invitation", url: inviteLink },
      }),
      text: `Hello ${payload.name || "there"},\n\nYou have been invited to join ${payload.organizationName || "MaintainPro"}. Accept using link: ${inviteLink}`,
    });
  }

  async sendTemporaryInvitationEmail(
    payload: TemporaryInvitationEmailPayload,
  ): Promise<SendEmailResult> {
    return this.send({
      to: { email: payload.email, name: payload.name },
      subject: "Your MaintainPro temporary login details",
      tags: ["identity.temporary-invitation", "auth"],
      correlationId: payload.correlationId,
      html: renderBrandedEmail({
        title: "Your temporary MaintainPro access",
        preheader: "Your temporary login details are ready",
        variant: "action_required",
        body: `<p style="margin:0 0 20px">Hello ${payload.name || "there"},</p><p style="margin:0 0 20px">You have been invited to access MaintainPro. Use the credentials below to sign in.</p><div style="margin:24px 0;padding:18px 16px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px"><p style="margin:0 0 10px;color:#6b7280;font-size:12px;line-height:16px">EMAIL</p><p style="margin:0 0 16px;color:#111827;font-size:15px;line-height:24px;font-weight:600">${payload.email}</p><p style="margin:0 0 10px;color:#6b7280;font-size:12px;line-height:16px">TEMPORARY PASSWORD</p><p style="margin:0;color:#111827;font-size:22px;line-height:30px;font-weight:700;letter-spacing:1px;font-family:monospace">${payload.temporaryPassword}</p></div><p style="margin:0 0 16px;color:#6b7280;font-size:13px;line-height:20px">These credentials expire in <strong style="color:#111827">${payload.expiresInMinutes} minutes</strong>.</p><div style="margin-top:20px;padding:14px 16px;background:#f9fafb;border-left:3px solid #2563eb;color:#6b7280;font-size:13px;line-height:20px">For your security, do not forward this email or share these credentials.</div>`,
      }),
      text: `Hello ${payload.name || "there"},\n\nYour temporary MaintainPro login details are ready.\n\nEmail: ${payload.email}\nTemporary password: ${payload.temporaryPassword}\n\nThese credentials expire in ${payload.expiresInMinutes} minutes. Do not forward this email or share these credentials.`,
    });
  }

  async sendLoginNotificationEmail(payload: {
    email: string;
    country?: string;
    state?: string;
    userAgent?: string;
    correlationId?: string;
  }): Promise<SendEmailResult> {
    const device = formatLoginDevice(payload.userAgent);
    const location = [payload.state, payload.country].filter(Boolean).join(", ");
    const details = [
      location
        ? `<p>Location: <strong>${location}</strong></p>`
        : `<p>IP address: <strong>unknown</strong></p>`,
      device && `<p>Device: <strong>${device}</strong></p>`,
    ]
      .filter(Boolean)
      .join("");
    return this.send({
      to: payload.email,
      subject: EMAIL_TEMPLATES.loginNotification.subject,
      tags: [EMAIL_TEMPLATES.loginNotification.id, "security"],
      correlationId: payload.correlationId,
      html: renderBrandedEmail({
        title: EMAIL_TEMPLATES.loginNotification.title,
        preheader: EMAIL_TEMPLATES.loginNotification.preheader,
        variant: EMAIL_TEMPLATES.loginNotification.variant,
        body: `<p>A new login was detected on your MaintainPro account.</p>${details}<p>If this was not you, reset your password immediately.</p>`,
      }),
      text: `A new login was detected on your MaintainPro account.${location ? ` Location: ${location}.` : " IP address: unknown."}${device ? ` Device: ${device}.` : ""}`,
    });
  }

  /**
   * Helper for backward compatibility during migration.
   */
  async sendVerificationOtp(email: string, otp: string): Promise<SendEmailResult> {
    return this.sendVerificationEmail({ email, tokenOrOtp: otp });
  }

  /**
   * Helper for backward compatibility during migration.
   */
  async sendPasswordResetOtp(email: string, otp: string): Promise<SendEmailResult> {
    return this.sendPasswordResetEmail({ email, resetToken: otp });
  }
}
