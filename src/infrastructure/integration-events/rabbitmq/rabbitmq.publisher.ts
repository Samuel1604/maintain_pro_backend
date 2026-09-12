import amqp, { type ChannelModel, type ConfirmChannel } from "amqplib";
import type { IntegrationEvent } from "@/infrastructure/events/bus/integration-event.js";
import type { SerializedIntegrationEvent } from "@/infrastructure/events/bus/serialized-integration-event.js";
import type { IntegrationEventPublisher } from "../integration-event-publisher.interface.js";
import {
  IntegrationEventBrokerUnavailable,
  IntegrationEventPublishFailed,
} from "../exceptions.js";
import type { Logger } from "@/infrastructure/logging/logger.interface.js";
import { getRabbitMqUrl, getRabbitMqExchange } from "./connection.js";

function serialize<TEvent extends IntegrationEvent>(event: TEvent): SerializedIntegrationEvent {
  return {
    eventId: event.eventId,
    name: event.name,
    routingKey: event.routingKey,
    payload: event.payload,
    occurredAt: event.occurredAt.toISOString(),
  };
}

/**
 * RabbitMqIntegrationEventPublisher
 *
 * Tier 4 of the event-processing architecture: durable, guaranteed-delivery,
 * exchange-routed publishing for cross-service Integration Events.
 *
 * This is the ONLY place in the application that touches amqplib directly.
 * It is not, and must never become, a home for background-job processing —
 * that responsibility belongs entirely to Tier 3 (BullMQ). This class only
 * ever accepts `IntegrationEvent`s.
 *
 * Delivery guarantee: publishes on a confirm channel (RabbitMQ "publisher
 * confirms") against a durable topic exchange, with messages marked
 * persistent — the broker acknowledges the message has been written to
 * disk before `publish()` resolves. Connection is lazy (first publish
 * triggers it) and self-heals: a dropped connection/channel is discarded
 * and transparently re-established on the next publish.
 */
export class RabbitMqIntegrationEventPublisher implements IntegrationEventPublisher {
  private readonly url: string;
  private readonly exchange: string;
  private connection?: ChannelModel;
  private channel?: ConfirmChannel;
  private connecting?: Promise<ConfirmChannel>;

  constructor(
    options: { url?: string; exchange?: string } = {},
    private readonly logger?: Logger,
  ) {
    this.url = options.url || getRabbitMqUrl();
    this.exchange = options.exchange || getRabbitMqExchange();
  }

  async publish<TEvent extends IntegrationEvent>(event: TEvent): Promise<void> {
    const logContext = {
      exchange: this.exchange,
      routingKey: event.routingKey,
      eventName: event.name,
      correlationId: event.eventId,
    };

    const startedAt = Date.now();

    try {
      const channel = await this.getChannel();
      const body = Buffer.from(JSON.stringify(serialize(event)));

      await new Promise<void>((resolve, reject) => {
        const ok = channel.publish(
          this.exchange,
          event.routingKey,
          body,
          {
            persistent: true,
            contentType: "application/json",
            messageId: event.eventId,
            timestamp: event.occurredAt.getTime(),
          },
          (err) => (err ? reject(err) : resolve()),
        );

        // publish() returning false means the channel's write buffer is
        // full (backpressure) — the message is still queued for send and
        // the confirm callback above still fires once the broker acks it,
        // so this is a signal to log, not an error to throw.
        if (!ok) {
          this.logger?.warn("[IntegrationEvents] RabbitMQ channel backpressure", logContext);
        }
      });

      this.logger?.info("[IntegrationEvents] Integration event published", {
        ...logContext,
        success: true,
        responseTimeMs: Date.now() - startedAt,
      });
    } catch (error) {
      this.logger?.error("[IntegrationEvents] Integration event publish failed", {
        ...logContext,
        success: false,
        responseTimeMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : String(error),
      });

      throw this.mapError(error);
    }
  }

  async close(): Promise<void> {
    this.connecting = undefined;
    try {
      await this.channel?.close();
    } catch {
      // already closed/broken — nothing to do
    }
    try {
      await this.connection?.close();
    } catch {
      // already closed/broken — nothing to do
    }
    this.channel = undefined;
    this.connection = undefined;
  }

  /**
   * Returns a ready confirm channel, connecting/reconnecting as needed.
   * Concurrent callers during a reconnect share the same in-flight
   * connection attempt instead of racing to open several.
   */
  private async getChannel(): Promise<ConfirmChannel> {
    if (this.channel) {
      return this.channel;
    }

    if (!this.connecting) {
      this.connecting = this.connect();
    }

    return this.connecting;
  }

  private async connect(): Promise<ConfirmChannel> {
    try {
      const connection = await amqp.connect(this.url);
      const channel = await connection.createConfirmChannel();
      await channel.assertExchange(this.exchange, "topic", { durable: true });

      connection.on("error", (err) => {
        this.logger?.error("[IntegrationEvents] RabbitMQ connection error", {
          exchange: this.exchange,
          error: err instanceof Error ? err.message : String(err),
        });
        this.channel = undefined;
        this.connection = undefined;
        this.connecting = undefined;
      });
      connection.on("close", () => {
        this.channel = undefined;
        this.connection = undefined;
        this.connecting = undefined;
      });

      this.connection = connection;
      this.channel = channel;

      this.logger?.info("[IntegrationEvents] Connected to RabbitMQ", { exchange: this.exchange });

      return channel;
    } catch (error) {
      this.connecting = undefined;
      throw error;
    }
  }

  private mapError(error: unknown): Error {
    if (error instanceof IntegrationEventBrokerUnavailable || error instanceof IntegrationEventPublishFailed) {
      return error;
    }

    const message = error instanceof Error ? error.message : String(error);
    const code = error && typeof error === "object" && "code" in error ? (error as { code?: string }).code : undefined;

    if (
      code === "ECONNREFUSED" ||
      code === "ENOTFOUND" ||
      code === "ETIMEDOUT" ||
      /connect|ECONNRESET|socket/i.test(message)
    ) {
      return new IntegrationEventBrokerUnavailable(
        "RabbitMQ is currently unreachable or the connection was lost.",
        { code },
      );
    }

    return new IntegrationEventPublishFailed(`Failed to publish integration event: ${message}`);
  }
}
