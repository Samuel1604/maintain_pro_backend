import { ValidationException } from "@/shared/errors/index.js";

/**
 * Currency metadata needed to safely convert between major and minor units.
 * Keep this list explicit: accepting an unknown currency with a guessed
 * exponent can silently charge the wrong amount.
 */
export const CURRENCY_METADATA = {
  NGN: { code: "NGN", fractionDigits: 2, minorUnit: "kobo" },
  USD: { code: "USD", fractionDigits: 2, minorUnit: "cent" },
  EUR: { code: "EUR", fractionDigits: 2, minorUnit: "cent" },
  GBP: { code: "GBP", fractionDigits: 2, minorUnit: "pence" },
  GHS: { code: "GHS", fractionDigits: 2, minorUnit: "pesewa" },
  ZAR: { code: "ZAR", fractionDigits: 2, minorUnit: "cent" },
  KES: { code: "KES", fractionDigits: 2, minorUnit: "cent" },
  JPY: { code: "JPY", fractionDigits: 0, minorUnit: "yen" },
  XOF: { code: "XOF", fractionDigits: 0, minorUnit: "franc" },
} as const;

export type SupportedCurrency = keyof typeof CURRENCY_METADATA;
export type CurrencyMetadata = (typeof CURRENCY_METADATA)[SupportedCurrency];

export interface Money {
  amountMinor: number;
  currency: SupportedCurrency;
}

const DECIMAL_PATTERN = /^\d+(?:\.\d+)?$/;

export function currencyMetadata(currency: string): CurrencyMetadata {
  const normalized = currency.trim().toUpperCase() as SupportedCurrency;
  const metadata = CURRENCY_METADATA[normalized];
  if (!metadata) {
    throw new ValidationException(`Unsupported currency: ${currency}`);
  }
  return metadata;
}

/** Convert a major-unit decimal to an integer provider/database amount. */
export function toMinorUnits(value: string | number, currency: string): number {
  const metadata = currencyMetadata(currency);
  const input = typeof value === "number" ? String(value) : value.trim();
  if (!DECIMAL_PATTERN.test(input)) {
    throw new ValidationException("Money amount must be a non-negative decimal");
  }

  const [whole, fraction = ""] = input.split(".");
  const allowedFraction = fraction.slice(0, metadata.fractionDigits);
  const discardedFraction = fraction.slice(metadata.fractionDigits);
  if (discardedFraction.replace(/0/g, "").length > 0) {
    throw new ValidationException(
      `${metadata.code} supports at most ${metadata.fractionDigits} decimal places`,
    );
  }

  const paddedFraction = allowedFraction.padEnd(metadata.fractionDigits, "0");
  const minor = Number(`${whole}${paddedFraction}` || "0");
  if (!Number.isSafeInteger(minor)) {
    throw new ValidationException("Money amount exceeds the supported range");
  }
  return minor;
}

/** Convert an integer provider/database amount to a major-unit decimal string. */
export function fromMinorUnits(amountMinor: number, currency: string): string {
  const metadata = currencyMetadata(currency);
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 0) {
    throw new ValidationException("Minor money amount must be a non-negative integer");
  }
  if (metadata.fractionDigits === 0) return String(amountMinor);

  const scale = 10 ** metadata.fractionDigits;
  return (amountMinor / scale).toFixed(metadata.fractionDigits);
}

export function money(amountMinor: number, currency: string): Money {
  const metadata = currencyMetadata(currency);
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 0) {
    throw new ValidationException("Minor money amount must be a non-negative integer");
  }
  return { amountMinor, currency: metadata.code };
}
