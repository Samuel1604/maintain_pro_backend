export type CommunicationChannel = "email" | "in_app";
export type EmailLayoutVariant = "standard" | "action_required" | "security" | "status_update" | "alert";
export interface CommunicationMessage { templateId: string; templateVersion: number; channel: CommunicationChannel; locale: string; subject?: string; title: string; preheader?: string; body: string; action?: { label: string; url: string }; metadata?: Record<string, unknown>; }
