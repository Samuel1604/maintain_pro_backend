import { UAParser } from "ua-parser-js";
import type { ParsedDevice } from "@/shared/types/device.types.js";

/**
 * Parses a raw User-Agent string into
 * human-readable device information.
 *
 * Example User-Agent:
 * Chrome/138.0.0.0
 * Safari/537.36
 */

export function parseDevice(userAgent: string): ParsedDevice {
  const parser = new UAParser(userAgent);

  const browser = parser.getBrowser();
  const os = parser.getOS();
  const device = parser.getDevice();

  return {
    ...(browser.name && {
      browser: browser.name,
    }),

    ...(browser.version && {
      browserVersion: browser.version,
    }),

    ...(os.name && {
      os: os.name,
    }),

    ...(os.version && {
      osVersion: os.version,
    }),

    ...(device.type && {
      deviceType: device.type,
    }),
  };
}
