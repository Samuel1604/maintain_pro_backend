import type { EmailProvider } from "../interfaces/email-provider.interface.js";
import type {
  SendEmailPayload,
  SendEmailResult,
  VerificationEmailPayload,
  PasswordResetEmailPayload,
  InvitationEmailPayload,
} from "../types/email.types.js";
import { LoggerService } from "@/infrastructure/logging/logger.service.js";
import { renderBrandedEmail } from "../utils/branded-email.js";
import { EMAIL_TEMPLATES } from "../templates/email.templates.js";
import type { EmailTemplateId } from "../templates/email.templates.js";

export class EmailService {
  private readonly frontendUrl: string;

  constructor(
    private readonly provider: EmailProvider,
    private readonly logger?: LoggerService,
  ) {
    this.frontendUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL || "http://localhost:3000";
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

  async sendTemplate(input: { to: SendEmailPayload["to"]; templateId: EmailTemplateId; body: string; text?: string; variables?: Record<string, unknown>; action?: { label: string; url: string }; organizationName?: string; correlationId?: string }): Promise<SendEmailResult> {
    const template = Object.values(EMAIL_TEMPLATES).find((item) => item.id === input.templateId);
    if (!template) throw new Error(`Unknown email template: ${input.templateId}`);
    return this.send({
      to: input.to,
      subject: template.subject,
      tags: [template.id, `template-v${template.version}`],
      correlationId: input.correlationId,
      html: renderBrandedEmail({ title: template.title, preheader: template.preheader, variant: template.variant, body: input.body, action: input.action, organizationName: input.organizationName }),
      text: input.text ?? input.body.replace(/<[^>]+>/g, ""),
      metadata: { templateId: template.id, templateVersion: String(template.version), ...Object.fromEntries(Object.entries(input.variables ?? {}).map(([key, value]) => [key, String(value)])) },
    });
  }

  /**
   * Business API: Send verification email with OTP / Token link.
   */
  async sendVerificationEmail(payload: VerificationEmailPayload): Promise<SendEmailResult> {
    const verifyLink = `${this.frontendUrl}/verify-email?token=${encodeURIComponent(payload.tokenOrOtp)}`;

    return this.send({
      to: { email: payload.email, name: payload.name },
      subject: EMAIL_TEMPLATES.verification.subject,
      tags: [EMAIL_TEMPLATES.verification.id, "auth"],
      correlationId: payload.correlationId,
      html: renderBrandedEmail({ title: "Verify your email", preheader: "Complete your MaintainPro registration", variant: "security", body: `<p>Hello ${payload.name || "there"},</p><p>Your verification code is <strong>${payload.tokenOrOtp}</strong>.</p>`, action: { label: "Verify email", url: verifyLink } }),
      text: `Hello ${payload.name || "there"},\n\nYour verification code is: ${payload.tokenOrOtp}\nOr verify using link: ${verifyLink}`,
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
      html: renderBrandedEmail({ title: "Reset your password", variant: "security", body: `<p>Hello ${payload.name || "there"},</p><p>We received a request to reset your MaintainPro password.</p><p style="font-size:12px;color:#64748b">If you did not request this, you can safely ignore this email.</p>`, action: { label: "Reset password", url: resetLink } }),
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
      html: renderBrandedEmail({ title: "You are invited to MaintainPro", preheader: `Join ${payload.organizationName || "your workspace"}`, variant: "action_required", organizationName: payload.organizationName, body: `<p>Hello ${payload.name || "there"},</p><p>You have been invited to join <strong>${payload.organizationName || "MaintainPro"}</strong> as <strong>${payload.role || "Team Member"}</strong>.</p>`, action: { label: "Accept invitation", url: inviteLink } }),
      text: `Hello ${payload.name || "there"},\n\nYou have been invited to join ${payload.organizationName || "MaintainPro"}. Accept using link: ${inviteLink}`,
    });
  }

  async sendLoginNotificationEmail(payload: { email: string; ipAddress?: string; userAgent?: string; correlationId?: string }): Promise<SendEmailResult> {
    const details = [payload.ipAddress && `<p>IP address: <strong>${payload.ipAddress}</strong></p>`, payload.userAgent && `<p>Device: <strong>${payload.userAgent}</strong></p>`].filter(Boolean).join("");
    return this.send({ to: payload.email, subject: EMAIL_TEMPLATES.loginNotification.subject, tags: [EMAIL_TEMPLATES.loginNotification.id, "security"], correlationId: payload.correlationId, html: renderBrandedEmail({ title: EMAIL_TEMPLATES.loginNotification.title, preheader: EMAIL_TEMPLATES.loginNotification.preheader, variant: EMAIL_TEMPLATES.loginNotification.variant, body: `<p>A new login was detected on your MaintainPro account.</p>${details}<p>If this was not you, reset your password immediately.</p>` }), text: `A new login was detected on your MaintainPro account.${payload.ipAddress ? ` IP address: ${payload.ipAddress}.` : ""}` });
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
