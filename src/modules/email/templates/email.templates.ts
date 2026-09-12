import type { EmailLayoutVariant } from "../types/communication.types.js";

export interface EmailTemplateDefinition {
  id: string;
  version: number;
  subject: string;
  title: string;
  variant: EmailLayoutVariant;
  preheader: string;
  variables: readonly string[];
}

export const EMAIL_TEMPLATES = {
  verification: { id: "identity.email-verification", version: 1, subject: "Verify your MaintainPro account", title: "Verify your email", variant: "security", preheader: "Complete your MaintainPro registration", variables: ["name", "tokenOrOtp", "actionUrl"] },
  passwordReset: { id: "identity.password-reset", version: 1, subject: "Reset your MaintainPro password", title: "Reset your password", variant: "security", preheader: "Reset your MaintainPro password securely", variables: ["name", "actionUrl"] },
  invitation: { id: "identity.invitation", version: 1, subject: "You have been invited to MaintainPro", title: "You are invited to MaintainPro", variant: "action_required", preheader: "Join your MaintainPro workspace", variables: ["name", "organizationName", "role", "actionUrl"] },
  loginNotification: { id: "identity.login-notification", version: 1, subject: "New login to your MaintainPro account", title: "New login detected", variant: "security", preheader: "A new login was detected on your account", variables: ["ipAddress", "userAgent"] },
  workOrderAssigned: { id: "work-orders.assigned", version: 1, subject: "You have a new work order", title: "New work order assigned", variant: "action_required", preheader: "A work order requires your attention", variables: ["recipientName", "workOrderId", "workOrderTitle", "priority", "actionUrl"] },
  workOrderUpdated: { id: "work-orders.updated", version: 1, subject: "Work order status updated", title: "Work order update", variant: "status_update", preheader: "A work order has changed", variables: ["recipientName", "workOrderId", "workOrderTitle", "status", "actionUrl"] },
  serviceRequestUpdated: { id: "service-requests.updated", version: 1, subject: "Service request update", title: "Service request update", variant: "status_update", preheader: "Your service request has been updated", variables: ["recipientName", "requestId", "requestTitle", "status", "actionUrl"] },
  slaAlert: { id: "sla.alert", version: 1, subject: "SLA requires attention", title: "SLA attention required", variant: "alert", preheader: "A service-level target needs attention", variables: ["recipientName", "slaName", "workOrderId", "alertType", "actionUrl"] },
  vendorApplicationDecision: { id: "marketplace.application-decision", version: 1, subject: "Vendor application update", title: "Application update", variant: "status_update", preheader: "There is an update on your vendor application", variables: ["recipientName", "opportunityName", "decision", "actionUrl"] },
  contractUpdated: { id: "contracts.updated", version: 1, subject: "Contract update", title: "Contract update", variant: "status_update", preheader: "A contract requires your attention", variables: ["recipientName", "contractId", "contractName", "status", "actionUrl"] },
  billingNotice: { id: "billing.notice", version: 1, subject: "MaintainPro billing notice", title: "Billing notice", variant: "action_required", preheader: "There is an update to your MaintainPro billing", variables: ["recipientName", "planName", "billingStatus", "actionUrl"] },
  inventoryAlert: { id: "inventory.low-stock", version: 1, subject: "Inventory requires attention", title: "Inventory alert", variant: "alert", preheader: "One or more inventory items are low", variables: ["recipientName", "itemName", "quantity", "actionUrl"] },
  preventiveMaintenanceReminder: { id: "preventive-maintenance.reminder", version: 1, subject: "Preventive maintenance reminder", title: "Maintenance reminder", variant: "action_required", preheader: "Scheduled maintenance is coming up", variables: ["recipientName", "planName", "scheduledDate", "facilityName", "actionUrl"] },
  securityAlert: { id: "security.alert", version: 1, subject: "Important security alert", title: "Security alert", variant: "alert", preheader: "Your MaintainPro account needs attention", variables: ["recipientName", "alertType", "occurredAt", "actionUrl"] },
  reportReady: { id: "reports.ready", version: 1, subject: "Your MaintainPro report is ready", title: "Report ready", variant: "standard", preheader: "Your requested report is ready to view", variables: ["recipientName", "reportName", "actionUrl"] },
} satisfies Record<string, EmailTemplateDefinition>;

export type EmailTemplateId = (typeof EMAIL_TEMPLATES)[keyof typeof EMAIL_TEMPLATES]["id"];
