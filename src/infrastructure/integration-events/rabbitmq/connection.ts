export function getRabbitMqUrl(): string {
  return process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672";
}

export function getRabbitMqExchange(): string {
  return process.env.RABBITMQ_EXCHANGE || "maintainpro.integration-events";
}
