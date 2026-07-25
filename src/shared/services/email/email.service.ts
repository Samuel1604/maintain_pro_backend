import { Resend } from "resend";
import type { SendEmailOptions } from "./email.types.js";
import {
  verificationOtpTemplate,
  passwordResetTemplate,
  emailChangeTemplate,
} from "./email.templates.js";

import { RedisService } from "@/shared/services/redis.service.js";

export class EmailService {
  constructor(
    private readonly redisService: RedisService,
    private readonly resend: Resend,
  ) {}

  async send({ to, subject, html }: SendEmailOptions) {
    await this.resend.emails.send({
      from: process.env.MAIL_FROM!,
      to,
      subject,
      html,
    });
  }

  async sendVerificationOtp(email: string, otp: string) {
    return this.send({
      to: email,

      subject: "Verify your email",

      html: verificationOtpTemplate(otp),
    });
  }

  async sendPasswordResetOtp(email: string, otp: string) {
    return this.send({
      to: email,

      subject: "Reset your password",

      html: passwordResetTemplate(otp),
    });
  }

  async sendEmailChangeOtp(email: string, otp: string) {
    await this.redisService.set(`email-change:${email}`, email, 600);

    return this.send({
      to: email,

      subject: "Change your email",

      html: emailChangeTemplate(otp),
    });
  }

  async sendInvitationEmail(email: string, token: string) {
    return this.send({
      to: email,

      subject: "You have been invited",

      html: verificationOtpTemplate(token),
    });
  }
}
