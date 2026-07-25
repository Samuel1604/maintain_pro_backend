import type { Request } from "express";
import { parseDevice } from "./device.js";
import type { SessionMetadata } from "../types/session.types.js";

export async function buildSessionMetadata(
  req: Request,
): Promise<SessionMetadata> {
  const userAgent = req.headers["user-agent"] ?? "";

  const device = parseDevice(userAgent);

  const ipAddress =
    (req.headers["cf-connecting-ip"] as string) ||
    req.ip ||
    req.socket.remoteAddress ||
    "unknown";

  return {
    ipAddress,

    userAgent,

    ...device,

    country: req.headers["cf-ipcountry"] as string,

    city: req.headers["cf-ipcity"] as string,

    timezone: req.headers["cf-timezone"] as string,
  };
}
