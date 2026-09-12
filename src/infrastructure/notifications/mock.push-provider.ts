import type { IPushProvider, PushPayload } from "./push.provider.interface.js";
import { LoggerService } from "@/infrastructure/logging/logger.service.js";

export class MockPushProvider implements IPushProvider {
  constructor(private readonly logger?: LoggerService) {}

  async sendToUser(userId: string, payload: PushPayload): Promise<boolean> {
    this.logger?.info(`[MockPushProvider] Push to userId=${userId}: ${payload.title} - ${payload.body}`);
    return true;
  }

  async sendToDevice(deviceToken: string, payload: PushPayload): Promise<boolean> {
    this.logger?.info(`[MockPushProvider] Push to token=${deviceToken}: ${payload.title} - ${payload.body}`);
    return true;
  }
}
