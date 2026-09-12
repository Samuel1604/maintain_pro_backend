export interface Recipient {
  email: string;
  name?: string;
}

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

export interface SendEmailPayload {
  to: Recipient | Recipient[] | string;
  subject: string;
  html?: string;
  text?: string;
  from?: Recipient;
  replyTo?: Recipient;
  tags?: string[];
  metadata?: Record<string, string>;
  attachments?: EmailAttachment[];
  correlationId?: string;
}

export interface SendEmailResult {
  messageId: string;
  provider: string;
  acceptedRecipients: string[];
  rejectedRecipients?: string[];
}

export interface VerificationEmailPayload {
  email: string;
  name?: string;
  tokenOrOtp: string;
  correlationId?: string;
}

export interface PasswordResetEmailPayload {
  email: string;
  name?: string;
  resetToken: string;
  correlationId?: string;
}

export interface InvitationEmailPayload {
  email: string;
  name?: string;
  invitationToken: string;
  organizationName?: string;
  role?: string;
  correlationId?: string;
}
