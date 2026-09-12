import { renderBrandedEmail } from "./branded-email.js";

export interface TemplateOptions {
  templateName: string;
  locale?: string;
  variables: Record<string, unknown>;
}

export class TemplateRenderer {
  async render(options: TemplateOptions): Promise<{ html: string; text: string }> {
    const title = String(options.variables.title ?? options.templateName);
    const body = String(options.variables.body ?? "");
    const actionUrl = options.variables.actionUrl ? String(options.variables.actionUrl) : undefined;
    const actionLabel = options.variables.actionLabel ? String(options.variables.actionLabel) : undefined;
    const html = renderBrandedEmail({
      title,
      body,
      preheader: options.variables.preheader ? String(options.variables.preheader) : title,
      action: actionUrl && actionLabel ? { label: actionLabel, url: actionUrl } : undefined,
      variant: (options.variables.variant as "standard" | "action_required" | "security" | "status_update" | "alert" | undefined) ?? "standard",
      organizationName: options.variables.organizationName ? String(options.variables.organizationName) : undefined,
    });
    return { html, text: String(options.variables.text ?? body.replace(/<[^>]+>/g, "")) };
  }
}
