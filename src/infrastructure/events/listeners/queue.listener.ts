import type { DomainEvent } from "@/infrastructure/events/bus/domain-event.js";
import type { EventHandler } from "@/infrastructure/events/bus/event-handler.interface.js";
import type { QueueDispatcher } from "@/infrastructure/queue/queue.service.js";
import { IdentityEvents } from "@/modules/identity/events/identity.events.js";
import type { UserLoggedInPayload } from "@/modules/identity/events/identity.event-payloads.js";
import { SendLoginNotificationJob } from "@/infrastructure/queue/jobs/send-login-notification.job.js";

/**
 * QueueListener
 *
 * Listens for domain events and translates them into typed Queue Jobs.
 *
 * Rules:
 * - No business logic.
 * - No side effects beyond dispatching a job.
 * - Each case maps exactly one event to exactly one job.
 */
export class QueueListener implements EventHandler<DomainEvent> {
  constructor(private readonly queueDispatcher: QueueDispatcher) {}

  public async handle(event: DomainEvent): Promise<void> {
    switch (event.name) {
      // NOTE: IdentityEvents.INVITATION_CREATED is intentionally NOT handled here.
      // InvitationService.create() already sends the invitation email directly
      // (it's the only place that has the real invite token/link). Routing it
      // through SendInvitationEmailJob as well previously caused a second,
      // link-less invitation email to go out. See EmailListener for the same note.

      case IdentityEvents.USER_LOGGED_IN: {
        const payload = event.payload as UserLoggedInPayload;

        await this.queueDispatcher.dispatch(
          new SendLoginNotificationJob({
            userId: payload.userId,
            email: payload.email,
            sessionId: payload.sessionId,
            ipAddress: payload.ipAddress,
            userAgent: payload.userAgent,
          }),
        );

        break;
      }

      default:
        // Event not mapped to a queue job — ignore.
        break;
    }
  }
}
