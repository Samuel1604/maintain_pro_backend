import { UserRepository } from "@/modules/users/user.repository.js";
import { UserReader } from "@/modules/users/user.reader.js";
import { UserService } from "@/modules/users/user.service.js";

import { SessionRepository } from "@/modules/identity/session/session.repository.js";
import { SessionService } from "@/modules/identity/session/session.service.js";

import { AuthRepository } from "@/modules/identity/auth.repository.js";
import { AuthService } from "@/modules/identity/auth.service.js";

import { AuditLogRepository } from "@/modules/audit/audit.repository.js";
import { AuditLogService } from "@/modules/audit/audit.service.js";

import { SecurityAlertRepository } from "@/modules/security/security.repository.js";
import { SecurityService } from "@/modules/security/security.service.js";

import { InvitationRepository } from "@/modules/invitations/invitation.repository.js";
import { InvitationService } from "@/modules/invitations/invitation.service.js";

import { VendorRepository } from "@/modules/vendors/vendor.repository.js";
import { VendorService } from "@/modules/vendors/vendor.service.js";

import { OrganizationRepository } from "@/modules/organizations/organization.repository.js";
import { OrganizationService } from "@/modules/organizations/organization.service.js";

import { LocationRepository } from "@/modules/locations/location.repository.js";
import { LocationService } from "@/modules/locations/location.service.js";

import { BillingRepository } from "@/modules/billing/billing.repository.js";
import { PaymentRepository } from "@/modules/billing/payments/payment.repository.js";
import { BillingService } from "@/modules/billing/billing.service.js";
import { BillingReader } from "@/modules/billing/billing.reader.js";

import { FacilityRepository } from "@/modules/facilities/facility.repository.js";
import { FacilityService } from "@/modules/facilities/facility.service.js";
import { AccessControlService } from "@/shared/services/authorization.service.js";

import { UploadRepository } from "@/modules/uploads/upload.repository.js";
import { UploadService } from "@/modules/uploads/upload.service.js";
import { CloudinaryStorageProvider } from "@/infrastructure/storage/cloudinary.storage-provider.js";

import { OtpService } from "@/modules/identity/otp/otp.service.js";
import { OAuthService } from "@/modules/identity/oauth/oauth.service.js";
import { LockoutService } from "@/modules/identity/lockout/lockout.service.js";

import { EmailService } from "@/modules/email/services/email.service.js";
import { createEmailProvider } from "@/modules/email/email-provider.factory.js";
import { RedisService } from "@/shared/services/redis.service.js";
import { RateLimitService } from "@/shared/services/rate-limit.service.js";
import { LoggerService } from "@/infrastructure/logging/logger.service.js";
import { ConsoleLogger } from "@/infrastructure/logging/console.logger.js";
import { QueueDispatcher } from "@/infrastructure/queue/queue.service.js";
import { QueueWorkerRegistry } from "@/infrastructure/queue/queue.registry.js";
import { LoginNotificationWorker } from "@/infrastructure/queue/workers/login-notification.worker.js";
import { EmailWorker } from "@/infrastructure/queue/workers/email.worker.js";
import { InvitationEmailWorker } from "@/infrastructure/queue/workers/invitation-email.worker.js";
import { PasswordResetEmailWorker } from "@/infrastructure/queue/workers/password-reset-email.worker.js";
import { SendInvitationEmailJob } from "@/infrastructure/queue/jobs/send-invitation-email.job.js";
import { SendPasswordResetEmailJob } from "@/infrastructure/queue/jobs/send-password-reset-email.job.js";
import { SendLoginNotificationJob } from "@/infrastructure/queue/jobs/send-login-notification.job.js";
import { SendEmailJob } from "@/infrastructure/queue/jobs/send-email.job.js";

import { AuditLogListener } from "@/infrastructure/events/listeners/audit.listener.js";
import { EmailListener } from "@/infrastructure/events/listeners/email.listener.js";
import {
  SendEmailChangeOtpEmailHandler,
  SendPasswordResetEmailHandler,
  SendVerificationOtpEmailHandler,
} from "@/infrastructure/events/handlers/email/index.js";
import { NotificationListener } from "@/infrastructure/events/listeners/notification.listener.js";
import { QueueListener } from "@/infrastructure/events/listeners/queue.listener.js";
import { SecurityListener } from "@/infrastructure/events/listeners/security.listener.js";
import { SessionSecurityListener } from "@/infrastructure/events/listeners/session-security.listener.js";
import { BillingListener } from "@/infrastructure/events/listeners/billing.listener.js";
import { BillingEvents } from "@/modules/billing/events/billing.events.js";

import { IdentityEvents } from "@/modules/identity/events/identity.events.js";
import { CrossCuttingEventListener } from "@/infrastructure/events/listeners/cross-cutting.listener.js";
import { NotificationPolicyService } from "@/modules/notifications/notification-policy.service.js";

import { CleanupTempUsersJob } from "@/infrastructure/jobs/cleanup-temp-users.job.js";

import { DOMAIN_EVENT_DISPATCH_JOB, QueuedEventBus } from "@/infrastructure/events/bus/index.js";
import { DomainEventWorker } from "@/infrastructure/events/dispatcher/domain-event.worker.js";
import { OutboxEventWorker } from "@/infrastructure/events/outbox/outbox-event.worker.js";
import { DefaultEventPublisher } from "@/infrastructure/events/publisher/index.js";
import {
  BullMqConsumer,
  BullMqProducer,
  BullMqQueueFactory,
  BullMqQueueService,
  QueueWorkerBootstrap,
  createBullMqConnection,
  DeadLetterQueue,
} from "@/infrastructure/queue/index.js";
import { InMemoryQueueService } from "@/infrastructure/queue/in-memory.queue.js";
import type { QueueProducer, QueueService } from "@/infrastructure/queue/queue.interface.js";

import { connectDB } from "@/config/database.js";
import express from "express";
import { RealtimePublisher } from "@/infrastructure/realtime/realtime.publisher.js";
import { SocketGateway } from "@/infrastructure/realtime/socket.gateway.js";
import { env } from "@/config/env.js";

const redisDisabled = ["true", "1", "yes"].includes(
  process.env.REDIS_DISABLE_CONNECTION?.trim().toLowerCase() ?? "",
);

export class AppContainer {
  private queueWorkersConfigured = false;
  private eventSubscribersConfigured = false;

  constructor() {
    // Register synchronous workers immediately so services used before init()
    // (including unit tests and CLI commands) still process domain events.
    this.configureQueueWorkers();
    this.configureEventBusSubscribers();
  }
  // --------------------------------------------------------------------------
  // Infrastructure
  // --------------------------------------------------------------------------

  // NOTE: There used to be a `resend` client here (the resend.com SDK),
  // constructed but never actually used to send anything — Brevo
  // (this.emailProvider below) is the only email provider actually wired
  // into EmailService. It looked like leftover scaffolding from a provider
  // migration, so it's been removed. If Resend is genuinely needed again,
  // wire it into an EmailProvider implementation (see
  // modules/email/interfaces/email-provider.interface.ts) rather than
  // constructing the raw SDK client directly in the container.

  public readonly redisService = new RedisService();

  public readonly loggerService = new LoggerService(new ConsoleLogger());
  public readonly realtimePublisher = new RealtimePublisher();

  public readonly bullMqConnection = createBullMqConnection();

  public readonly queueFactory = new BullMqQueueFactory(this.bullMqConnection);

  public readonly workerRegistry = new QueueWorkerRegistry(this.loggerService);

  public readonly queueProducer: QueueProducer =
    env.QUEUE_DRIVER === "in-memory" || redisDisabled
      ? new InMemoryQueueService(this.loggerService, this.workerRegistry)
      : new BullMqProducer(this.queueFactory, this.loggerService);

  public readonly outboxWorker = new OutboxEventWorker(
    this.queueProducer,
    undefined,
    this.loggerService,
  );

  public readonly eventBus = new QueuedEventBus(
    this.queueProducer,
    this.loggerService,
    this.realtimePublisher,
  );

  public readonly eventPublisher = new DefaultEventPublisher(this.eventBus);

  public readonly queueService: QueueService =
    env.QUEUE_DRIVER === "in-memory" || redisDisabled
      ? (this.queueProducer as InMemoryQueueService)
      : new BullMqQueueService(this.queueProducer as BullMqProducer, this.workerRegistry);

  public readonly queueDispatcher = new QueueDispatcher(this.queueService, this.workerRegistry);

  public readonly queueConsumer = new BullMqConsumer(
    this.bullMqConnection,
    this.queueService,
    this.loggerService,
    undefined,
    new DeadLetterQueue(this.bullMqConnection, this.loggerService),
  );

  public readonly queueWorkerBootstrap = new QueueWorkerBootstrap(
    this.queueConsumer,
    this.loggerService,
  );

  // --------------------------------------------------------------------------
  // Repositories
  // --------------------------------------------------------------------------

  public readonly userRepository = new UserRepository();

  public readonly sessionRepository = new SessionRepository();

  public readonly authRepository = new AuthRepository();

  public readonly auditLogRepository = new AuditLogRepository();

  public readonly securityAlertRepository = new SecurityAlertRepository();

  public readonly invitationRepository = new InvitationRepository();

  public readonly vendorRepository = new VendorRepository();

  public readonly organizationRepository = new OrganizationRepository();

  public readonly locationRepository = new LocationRepository();

  public readonly uploadRepository = new UploadRepository();

  public readonly storageProvider = new CloudinaryStorageProvider();

  // --------------------------------------------------------------------------
  // Shared Services
  // --------------------------------------------------------------------------

  public readonly otpService = new OtpService();

  public readonly rateLimitService = new RateLimitService();

  public readonly oauthService = new OAuthService();

  public readonly auditLogService = new AuditLogService(this.auditLogRepository);

  public readonly securityService = new SecurityService(this.securityAlertRepository);

  // Provider is selected purely by MAIL_PROVIDER config (see
  // email-provider.factory.ts). Swapping Gmail for Brevo/Resend/SES later
  // is a config + factory-case change only — nothing below this line, and
  // no business module, needs to change.
  public readonly emailProvider = createEmailProvider(this.loggerService);

  public readonly emailService = new EmailService(this.emailProvider, this.loggerService);

  // --------------------------------------------------------------------------
  // Readers
  // --------------------------------------------------------------------------

  public readonly userReader = new UserReader(this.userRepository);
  public readonly socketGateway = new SocketGateway(
    this.userReader,
    this.sessionRepository,
    this.realtimePublisher,
    this.loggerService,
  );

  // --------------------------------------------------------------------------
  // Domain Services
  // --------------------------------------------------------------------------

  public readonly sessionService = new SessionService(
    this.sessionRepository,
    this.userReader,
    this.eventBus,
  );

  public readonly userService = new UserService(
    this.userRepository,
    this.redisService,
    this.otpService,
    this.rateLimitService,
    this.eventBus,
  );

  public readonly organizationService = new OrganizationService(this.organizationRepository);

  public readonly locationService = new LocationService(this.locationRepository);

  public readonly uploadService = new UploadService(this.uploadRepository, this.storageProvider);

  public readonly vendorService = new VendorService(this.vendorRepository);

  public readonly invitationService = new InvitationService(
    this.invitationRepository,
    this.userReader,
    this.emailService,
    this.auditLogService,
    this.eventBus,
    // Pass userService interface for temp-invite user creation
    this.userService,
  );

  // ------------------------------------------------------------------------
  // Billing
  // ------------------------------------------------------------------------

  public readonly billingRepository = new BillingRepository();

  public readonly billingReader = new BillingReader(this.billingRepository);

  public readonly paymentRepository = new PaymentRepository();

  public readonly billingService = new BillingService(
    this.billingRepository,
    this.paymentRepository,
    this.organizationService,
    this.vendorService,
    this.eventPublisher,
  );

  public readonly cleanupTempUsersJob = new CleanupTempUsersJob(
    this.userRepository,
    this.loggerService,
  );

  public readonly lockoutService = new LockoutService(
    this.userService,
    this.userReader,
    this.auditLogService,
    this.eventBus,
  );

  public readonly authService = new AuthService(
    this.authRepository,
    this.userReader,
    this.userService,
    this.sessionService,
    this.otpService,
    this.lockoutService,
    this.invitationService,
    this.eventBus,
  );

  public readonly auditLogListener = new AuditLogListener(this.auditLogService);

  public readonly securityListener = new SecurityListener(this.securityService);

  public readonly sessionSecurityListener = new SessionSecurityListener(this.sessionService);

  public readonly emailListener = new EmailListener(this.emailService);

  public readonly sendVerificationOtpEmailHandler = new SendVerificationOtpEmailHandler(
    this.emailService,
  );

  public readonly sendPasswordResetEmailHandler = new SendPasswordResetEmailHandler(
    this.emailService,
  );

  public readonly sendEmailChangeOtpEmailHandler = new SendEmailChangeOtpEmailHandler(
    this.emailService,
  );

  // Not currently subscribed to anything — see the NOTE in
  // configureEventBusSubscribers(). Kept constructed so it's ready to wire
  // up once a real notification worker exists to consume its jobs.
  public readonly notificationListener = new NotificationListener(this.queueDispatcher);

  public readonly crossCuttingEventListener = new CrossCuttingEventListener(
    this.auditLogService,
    new NotificationPolicyService(),
  );

  public readonly queueListener = new QueueListener(this.queueDispatcher);

  public readonly billingListener = new BillingListener(
    this.organizationService,
    this.vendorService,
    this.emailService,
    this.loggerService,
  );

  // ------------------------------------------------------------------------
  // Facilities
  // ------------------------------------------------------------------------

  public readonly facilityRepository = new FacilityRepository();

  public readonly facilityService = new FacilityService(
    this.facilityRepository,
    new AccessControlService(),
    this.billingReader,
    this.eventPublisher,
  );

  private configureQueueWorkers(): void {
    if (this.queueWorkersConfigured) return;
    this.queueWorkersConfigured = true;

    this.queueDispatcher.registerWorker(
      DOMAIN_EVENT_DISPATCH_JOB,
      new DomainEventWorker(this.eventBus.registry, this.loggerService),
    );

    // Password-reset events currently use the in-process email handler.
    // The queue worker is still registered for explicit job dispatch and replay.

    const loginNotificationWorker = new LoginNotificationWorker(
      this.emailService,
      this.loggerService,
    );

    this.queueDispatcher.registerWorker(SendLoginNotificationJob.NAME, loginNotificationWorker);

    const emailWorker = new EmailWorker(this.emailService, this.loggerService);

    this.queueDispatcher.registerWorker(SendEmailJob.NAME, emailWorker);

    const invitationWorker = new InvitationEmailWorker(this.emailService, this.loggerService);
    this.queueDispatcher.registerWorker(SendInvitationEmailJob.NAME, invitationWorker);

    const passwordResetWorker = new PasswordResetEmailWorker(this.emailService, this.loggerService);
    this.queueDispatcher.registerWorker(SendPasswordResetEmailJob.NAME, passwordResetWorker);
  }

  private configureEventBusSubscribers(): void {
    if (this.eventSubscribersConfigured) return;
    this.eventSubscribersConfigured = true;

    [
      "ItemCreated",
      "ItemUpdated",
      "ItemDeactivated",
      "LocationCreated",
      "StockReceived",
      "StockReserved",
      "ReservationReleased",
      "StockIssued",
      "StockConsumed",
      "StockReturned",
      "StockAdjusted",
      "StockTransferred",
      "ApplicationSubmitted",
      "QuotationSubmitted",
      "QuotationRevisionCreated",
      "ContractAwardCreated",
      "ContractAwardActivated",
      "ContractAwardTerminated",
      "SLAProposed",
      "LowStockDetected",
      "ProcurementNotificationRequested",
      // These lifecycle events are intentionally observed by the shared
      // audit listener even when no module-specific side effect is needed.
      "facility.created",
      "facility.updated",
      "facility.deactivated",
      "facility.deleted",
      "WorkOrderCreated",
      "WorkOrderAssigned",
      "WorkOrderStatusChanged",
      "VendorAssignmentAccepted",
      "VendorAssignmentRejected",
      "InvoiceSubmitted",
      "InvoiceDisputed",
      "PreventiveMaintenanceSkipped",
      "PreventiveMaintenanceOccurrenceSkipped",
      "WorkOrderAttachmentAdded",
      "PreventiveMaintenancePlanCreated",
      "PreventiveMaintenancePlanUpdated",
      "PreventiveMaintenancePlanCancelled",
      "PreventiveMaintenanceOccurrenceCreated",
      "PreventiveMaintenanceOccurrenceApproved",
      "PreventiveMaintenanceOccurrenceRejected",
      "PreventiveMaintenanceOccurrenceCancelled",
      "PreventiveMaintenanceOccurrenceAssignmentChanged",
      "PreventiveMaintenanceOccurrenceLinkedToWorkOrder",
      "ServiceRequestCreated",
      "ServiceRequestApproved",
      "ServiceRequestRejected",
      "ServiceRequestRated",
      "VendorApplicationSubmitted",
      "VendorApplicationStatusChanged",
      "NotificationCreated",
    ].forEach((eventName) => this.eventBus.subscribe(eventName, this.crossCuttingEventListener));

    this.eventBus.subscribe(IdentityEvents.USER_LOGGED_IN, this.auditLogListener);
    this.eventBus.subscribe(IdentityEvents.USER_LOGIN_FAILED, this.auditLogListener);
    this.eventBus.subscribe(IdentityEvents.USER_LOGGED_OUT, this.auditLogListener);
    this.eventBus.subscribe(IdentityEvents.SESSION_CREATED, this.auditLogListener);
    this.eventBus.subscribe(IdentityEvents.SESSION_REVOKED, this.auditLogListener);
    this.eventBus.subscribe(IdentityEvents.SECURITY_ALERT_RAISED, this.auditLogListener);
    this.eventBus.subscribe(IdentityEvents.SECURITY_ALERT_RAISED, this.securityListener);
    this.eventBus.subscribe(IdentityEvents.INVITATION_ACCEPTED, this.auditLogListener);
    this.eventBus.subscribe(IdentityEvents.INVITATION_CREATED, this.auditLogListener);
    this.eventBus.subscribe(IdentityEvents.ORGANIZATION_REGISTERED, this.auditLogListener);
    this.eventBus.subscribe(IdentityEvents.VENDOR_REGISTERED, this.auditLogListener);
    this.eventBus.subscribe(IdentityEvents.USER_REGISTERED, this.auditLogListener);

    // --------------------------------------------------------------
    // Account lockout: security alert + audit entry + user notification,
    // all reacting to LockoutService's single UserLockedOutEvent publish.
    // --------------------------------------------------------------
    this.eventBus.subscribe(IdentityEvents.USER_LOCKED_OUT, this.securityListener);
    this.eventBus.subscribe(IdentityEvents.USER_LOCKED_OUT, this.auditLogListener);
    this.eventBus.subscribe(IdentityEvents.USER_LOCKED_OUT, this.emailListener);

    // --------------------------------------------------------------
    // Password changed (self-service): security alert + audit entry +
    // "your password changed" email, all reacting to UserService's single
    // PasswordChangedEvent publish.
    // --------------------------------------------------------------
    this.eventBus.subscribe(IdentityEvents.PASSWORD_CHANGED, this.securityListener);
    this.eventBus.subscribe(IdentityEvents.PASSWORD_CHANGED, this.auditLogListener);
    this.eventBus.subscribe(IdentityEvents.PASSWORD_CHANGED, this.emailListener);
    // A changed password invalidates every other active session — a
    // stolen session must not survive the owner regaining control of
    // their password (see SessionSecurityListener).
    this.eventBus.subscribe(IdentityEvents.PASSWORD_CHANGED, this.sessionSecurityListener);

    // --------------------------------------------------------------
    // Password reset (forgot-password flow completion): security alert +
    // audit entry + confirmation email, all reacting to UserService's
    // single PasswordResetCompletedEvent publish.
    // --------------------------------------------------------------
    this.eventBus.subscribe(IdentityEvents.PASSWORD_RESET_COMPLETED, this.securityListener);
    this.eventBus.subscribe(IdentityEvents.PASSWORD_RESET_COMPLETED, this.auditLogListener);
    this.eventBus.subscribe(IdentityEvents.PASSWORD_RESET_COMPLETED, this.emailListener);
    // Same reasoning as PASSWORD_CHANGED above — a completed reset is
    // exactly the "someone else may have access" scenario, so every other
    // active session must be invalidated too.
    this.eventBus.subscribe(IdentityEvents.PASSWORD_RESET_COMPLETED, this.sessionSecurityListener);

    // --------------------------------------------------------------
    // Email changed: security alert + audit entry + notice to the OLD
    // address, all reacting to UserService's single EmailChangedEvent
    // publish.
    // --------------------------------------------------------------
    this.eventBus.subscribe(IdentityEvents.EMAIL_CHANGED, this.securityListener);
    this.eventBus.subscribe(IdentityEvents.EMAIL_CHANGED, this.auditLogListener);
    this.eventBus.subscribe(IdentityEvents.EMAIL_CHANGED, this.emailListener);

    this.eventBus.subscribe(IdentityEvents.OTP_REQUESTED, this.sendVerificationOtpEmailHandler);
    this.eventBus.subscribe(IdentityEvents.OTP_REQUESTED, this.sendEmailChangeOtpEmailHandler);
    this.eventBus.subscribe(IdentityEvents.EMAIL_VERIFIED, this.emailListener);
    this.eventBus.subscribe(
      IdentityEvents.PASSWORD_RESET_REQUESTED,
      this.sendPasswordResetEmailHandler,
    );
    this.eventBus.subscribe(IdentityEvents.INVITATION_CREATED, this.emailListener);

    const allIdentityEvents = [
      IdentityEvents.ORGANIZATION_REGISTERED,
      IdentityEvents.VENDOR_REGISTERED,
      IdentityEvents.USER_REGISTERED,
      IdentityEvents.USER_LOGGED_IN,
      IdentityEvents.USER_LOGIN_FAILED,
      IdentityEvents.USER_LOGGED_OUT,
      IdentityEvents.USER_LOCKED_OUT,
      IdentityEvents.SESSION_CREATED,
      IdentityEvents.SESSION_REVOKED,
      IdentityEvents.SESSION_EXPIRED,
      IdentityEvents.SECURITY_ALERT_RAISED,
      IdentityEvents.OTP_REQUESTED,
      IdentityEvents.OTP_VERIFIED,
      IdentityEvents.VERIFICATION_LINK_REQUESTED,
      IdentityEvents.EMAIL_VERIFIED,
      IdentityEvents.EMAIL_CHANGED,
      IdentityEvents.PASSWORD_RESET_REQUESTED,
      IdentityEvents.PASSWORD_RESET_COMPLETED,
      IdentityEvents.PASSWORD_CHANGED,
      IdentityEvents.INVITATION_CREATED,
      IdentityEvents.INVITATION_ACCEPTED,
      IdentityEvents.INVITATION_EXPIRED,
    ] as const;

    // NOTE: NotificationListener is intentionally NOT subscribed here.
    //
    // It used to be wired to every event in `allIdentityEvents` below,
    // unconditionally enqueuing a `notification.${event.name}` job for each
    // one (including high-frequency, non-actionable events like
    // SESSION_CREATED, which fires on every token refresh). No worker was
    // ever registered to consume any `notification.*` job name, so every one
    // of those jobs was picked up by BullMQ, logged as
    // "No worker registered. Job skipped.", and discarded. That's queue
    // throughput and log volume spent on jobs that could never do anything.
    //
    // Re-enable this (ideally scoped to just the events that should surface
    // an in-app/push notification, not the full event catalog) once a real
    // notification worker exists to consume these jobs.

    allIdentityEvents.forEach((eventName) => {
      this.eventBus.subscribe(eventName, this.queueListener);
    });

    // Billing events: audit + email notifications
    this.eventBus.subscribe(BillingEvents.SUBSCRIPTION_CREATED, this.auditLogListener);
    this.eventBus.subscribe(BillingEvents.SUBSCRIPTION_ACTIVATED, this.auditLogListener);
    this.eventBus.subscribe(BillingEvents.SUBSCRIPTION_UPGRADED, this.auditLogListener);
    this.eventBus.subscribe(BillingEvents.SUBSCRIPTION_DOWNGRADED, this.auditLogListener);
    this.eventBus.subscribe(BillingEvents.SUBSCRIPTION_CANCELLED, this.auditLogListener);
    this.eventBus.subscribe(BillingEvents.SUBSCRIPTION_EXPIRED, this.auditLogListener);

    this.eventBus.subscribe(BillingEvents.SUBSCRIPTION_CREATED, this.billingListener);
    this.eventBus.subscribe(BillingEvents.SUBSCRIPTION_ACTIVATED, this.billingListener);
    this.eventBus.subscribe(BillingEvents.SUBSCRIPTION_UPGRADED, this.billingListener);
    this.eventBus.subscribe(BillingEvents.SUBSCRIPTION_DOWNGRADED, this.billingListener);
    this.eventBus.subscribe(BillingEvents.SUBSCRIPTION_CANCELLED, this.billingListener);
    this.eventBus.subscribe(BillingEvents.SUBSCRIPTION_EXPIRED, this.billingListener);
  }

  /**
   * Initializes all application resources and dependencies.
   * This method should be called once at application startup.
   */
  public async init(): Promise<void> {
    this.loggerService.info("Initializing application container...");

    // 1. Connect to Database
    try {
      await connectDB();
      this.loggerService.info("Database connected.");
    } catch (err) {
      // Tests may explicitly skip or mock the database. Runtime environments
      // must not start accepting requests without MongoDB: Mongoose would
      // buffer the first query and turn a dependency outage into a misleading
      // 10-second 500 (for example, users.findOne during login).
      this.loggerService.warn("Database connection failed during init", {
        error: String(err),
      });
      if (env.NODE_ENV !== "test") {
        throw err;
      }
    }

    // 2. Configure Queue Workers and Event Subscribers
    this.configureQueueWorkers();
    this.configureEventBusSubscribers();
    this.loggerService.info("Queue workers and event subscribers configured.", {
      workers: this.queueDispatcher.registeredJobNames(),
    });

    // 3. Start background jobs (e.g., cleanup)
    this.cleanupTempUsersJob.start();
    this.loggerService.info("Background cleanup job started.");

    this.loggerService.info("Application container initialized successfully.");
  }

  /**
   * Shutdown all application resources and dependencies gracefully.
   */
  public async shutdown(): Promise<void> {
    this.loggerService.info("Shutting down application container...");

    this.outboxWorker.stop();

    await this.queueProducer.close?.();
    this.loggerService.info("BullMQ producer closed.");

    this.socketGateway.close();
    await this.queueConsumer.close();
    this.loggerService.info("BullMQ consumer closed.");

    this.loggerService.info("Application container shut down successfully.");
  }

  public async startServer(
    port: number,
    appInstance?: express.Express,
  ): Promise<import("http").Server> {
    const serverApp = appInstance ?? express();

    return new Promise((resolve) => {
      const server = serverApp.listen(port, () => {
        // Keep API requests bounded even when a downstream dependency stalls.
        // Individual handlers should still return useful errors before this
        // safety net fires.
        server.requestTimeout = 15_000;
        server.headersTimeout = 16_000;
        this.socketGateway.attach(server, env.CLIENT_URL);
        this.loggerService.info(`HTTP server listening on port ${port}`);
        resolve(server);
      });
    });
  }

  public async startWorkers(): Promise<void> {
    if (env.QUEUE_DRIVER === "in-memory" || redisDisabled) {
      this.loggerService.info("Queue workers disabled; using the in-memory queue driver.");
      return;
    }
    this.loggerService.info("Starting BullMQ workers...");
    this.outboxWorker.start();
    this.queueWorkerBootstrap.start();
    this.loggerService.info("BullMQ workers started.");
  }
}
