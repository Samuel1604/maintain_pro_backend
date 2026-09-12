import { describe, it, expect, afterEach } from "vitest";
import amqp, { type ChannelModel, type Channel } from "amqplib";
import { UniversalEventPublisher } from "@/infrastructure/events/publisher/universal-event-publisher.js";
import { InMemoryEventBus } from "@/infrastructure/events/bus/in-memory-event-bus.js";
import { DomainEvent } from "@/infrastructure/events/bus/domain-event.js";
import { IntegrationEvent } from "@/infrastructure/events/bus/integration-event.js";
import { RabbitMqIntegrationEventPublisher } from "@/infrastructure/integration-events/rabbitmq/rabbitmq.publisher.js";
import { IntegrationEventBrokerUnavailable } from "@/infrastructure/integration-events/exceptions.js";

class SampleDomainEvent extends DomainEvent<{ hello: string }> {
  constructor(payload: { hello: string }) {
    super("test.sample.domain-event", payload);
  }
}

class SampleIntegrationEvent extends IntegrationEvent<{ hello: string }> {
  constructor(payload: { hello: string }) {
    super("test.sample.integration-event", payload);
  }
}

const TEST_EXCHANGE = "maintainpro.integration-events.test";

describe("UniversalEventPublisher", () => {
  const openConnections: Array<ChannelModel> = [];
  const openPublishers: Array<RabbitMqIntegrationEventPublisher> = [];

  afterEach(async () => {
    await Promise.allSettled(openPublishers.map((p) => p.close()));
    await Promise.allSettled(openConnections.map((c) => c.close()));
    openConnections.length = 0;
    openPublishers.length = 0;
  });

  /**
   * Regression/behavior test for the core routing contract: business code
   * calls one method, publish(), and the event's own class — not any flag
   * or config — decides whether it stays in-process (Tier 1) or crosses
   * into RabbitMQ (Tier 4).
   */
  it("routes a DomainEvent to the in-memory bus, never touching the network", async () => {
    const domainBus = new InMemoryEventBus();
    let handledPayload: { hello: string } | undefined;
    domainBus.subscribe<SampleDomainEvent>("test.sample.domain-event", {
      handle: async (event) => {
        handledPayload = event.payload;
      },
    });

    // Point the integration publisher at an unreachable address — if the
    // domain event accidentally got routed there, this test would fail
    // with a broker-unavailable error instead of passing.
    const integrationPublisher = new RabbitMqIntegrationEventPublisher({
      url: "amqp://guest:guest@127.0.0.1:1", // nothing here
    });
    openPublishers.push(integrationPublisher);

    const publisher = new UniversalEventPublisher(domainBus, integrationPublisher);

    await publisher.publish(new SampleDomainEvent({ hello: "domain" }));

    expect(handledPayload).toEqual({ hello: "domain" });
  });

  /**
   * Regression/behavior test for Tier 4: an IntegrationEvent published
   * through the Universal Event Publisher must actually arrive at a real
   * RabbitMQ exchange, durable and routed by the event's routingKey — not
   * just "not throw".
   */
  it.skipIf(process.env.RABBITMQ_TESTS !== "true")("routes an IntegrationEvent to RabbitMQ with durable, exchange-routed delivery", async () => {
    const domainBus = new InMemoryEventBus();
    const integrationPublisher = new RabbitMqIntegrationEventPublisher({
      exchange: TEST_EXCHANGE,
    });
    openPublishers.push(integrationPublisher);

    const publisher = new UniversalEventPublisher(domainBus, integrationPublisher);

    // Independent consumer, separate from the publisher's own connection,
    // proving the message really left the process via the broker.
    const connection = await amqp.connect(
      process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672",
    );
    openConnections.push(connection);
    const channel: Channel = await connection.createChannel();
    await channel.assertExchange(TEST_EXCHANGE, "topic", { durable: true });
    const { queue } = await channel.assertQueue("", { exclusive: true });
    await channel.bindQueue(queue, TEST_EXCHANGE, "#");

    const received: unknown[] = [];
    await channel.consume(
      queue,
      (msg) => {
        if (!msg) return;
        received.push(JSON.parse(msg.content.toString()));
        channel.ack(msg);
      },
      { noAck: false },
    );

    await publisher.publish(new SampleIntegrationEvent({ hello: "integration" }));

    await new Promise((resolve) => setTimeout(resolve, 300));

    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({
      name: "test.sample.integration-event",
      routingKey: "test.sample.integration-event",
      payload: { hello: "integration" },
    });
  });

  it("maps an unreachable broker to IntegrationEventBrokerUnavailable, never a raw amqplib error", async () => {
    const domainBus = new InMemoryEventBus();
    const integrationPublisher = new RabbitMqIntegrationEventPublisher({
      url: "amqp://guest:guest@127.0.0.1:1",
    });
    openPublishers.push(integrationPublisher);

    const publisher = new UniversalEventPublisher(domainBus, integrationPublisher);

    await expect(
      publisher.publish(new SampleIntegrationEvent({ hello: "unreachable" })),
    ).rejects.toBeInstanceOf(IntegrationEventBrokerUnavailable);
  });
});
