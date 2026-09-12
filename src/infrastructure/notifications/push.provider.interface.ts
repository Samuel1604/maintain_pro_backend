export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

export interface IPushProvider {
  sendToUser(userId: string, payload: PushPayload): Promise<boolean>;
  sendToDevice(deviceToken: string, payload: PushPayload): Promise<boolean>;
}
