import type { Request } from "express";
import { isIP } from "node:net";
import { parseDevice } from "./device.js";
import type { SessionMetadata } from "../types/session.types.js";

const CLOUDFLARE_IPV4_RANGES = [
  "103.21.244.0/22",
  "103.22.200.0/22",
  "103.31.4.0/22",
  "104.16.0.0/13",
  "104.24.0.0/14",
  "108.162.192.0/18",
  "131.0.72.0/22",
  "141.101.64.0/18",
  "162.158.0.0/15",
  "172.64.0.0/13",
  "173.245.48.0/20",
  "188.114.96.0/20",
  "190.93.240.0/20",
  "197.234.240.0/22",
  "198.41.128.0/17",
];

const CLOUDFLARE_IPV6_RANGES = [
  "2400:cb00::/32",
  "2606:4700::/32",
  "2803:f800::/32",
  "2405:b500::/32",
  "2405:8100::/32",
  "2a06:98c0::/29",
  "2c0f:f248::/32",
];

const firstHeader = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const normalizeIp = (ip: string | undefined) =>
  ip?.replace(/^::ffff:/, "").trim();

const ipv4ToNumber = (ip: string) =>
  ip.split(".").reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0;

const isIpv4InCidr = (ip: string, cidr: string) => {
  const [range, prefixLength] = cidr.split("/");

  if (!range || !prefixLength) {
    return false;
  }

  const mask = (0xffffffff << (32 - Number(prefixLength))) >>> 0;

  return (ipv4ToNumber(ip) & mask) === (ipv4ToNumber(range) & mask);
};

const ipv6ToBigInt = (ip: string) => {
  const [head, tail = ""] = ip.split("::");
  const headParts = head ? head.split(":") : [];
  const tailParts = tail ? tail.split(":") : [];
  const missingParts = 8 - headParts.length - tailParts.length;
  const parts = [
    ...headParts,
    ...Array(Math.max(missingParts, 0)).fill("0"),
    ...tailParts,
  ];

  return parts.reduce(
    (acc, part) => (acc << 16n) + BigInt(parseInt(part || "0", 16)),
    0n,
  );
};

const isIpv6InCidr = (ip: string, cidr: string) => {
  const [range, prefixLength] = cidr.split("/");

  if (!range || !prefixLength) {
    return false;
  }

  const prefix = Number(prefixLength);
  const mask = ((1n << BigInt(prefix)) - 1n) << BigInt(128 - prefix);

  return (ipv6ToBigInt(ip) & mask) === (ipv6ToBigInt(range) & mask);
};

const isCloudflareIp = (ip: string | undefined) => {
  const normalizedIp = normalizeIp(ip);

  if (!normalizedIp) {
    return false;
  }

  const ipVersion = isIP(normalizedIp);

  if (ipVersion === 4) {
    return CLOUDFLARE_IPV4_RANGES.some((cidr) =>
      isIpv4InCidr(normalizedIp, cidr),
    );
  }

  if (ipVersion === 6) {
    return CLOUDFLARE_IPV6_RANGES.some((cidr) =>
      isIpv6InCidr(normalizedIp, cidr),
    );
  }

  return false;
};

export async function buildSessionMetadata(
  req: Request,
): Promise<SessionMetadata> {
  const userAgent = firstHeader(req.headers["user-agent"]) ?? "";

  const device = parseDevice(userAgent);

  const cloudflareTrusted = isCloudflareIp(req.socket.remoteAddress);
  const cloudflareIp = firstHeader(req.headers["cf-connecting-ip"]);

  const ipAddress =
    (cloudflareTrusted && cloudflareIp) ||
    req.ip ||
    req.socket.remoteAddress ||
    "unknown";

  return {
    ipAddress,

    userAgent,

    ...device,

    ...(cloudflareTrusted && {
      country: firstHeader(req.headers["cf-ipcountry"]),

      city: firstHeader(req.headers["cf-ipcity"]),

      timezone: firstHeader(req.headers["cf-timezone"]),
    }),
  };
}
