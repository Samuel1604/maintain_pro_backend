import axios from "axios";
import {
  currencyMetadata,
  fromMinorUnits,
  toMinorUnits,
  type SupportedCurrency,
} from "@/shared/money/money.js";

type Rates = Record<string, number>;
type RateSnapshot = { rates: Rates; date?: string; expiresAt: number };
const FRANKFURTER_RATES_URL = "https://api.frankfurter.dev/v2/rates?base=USD";
const RATE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
let rateCache: RateSnapshot | undefined;

function parseRates(payload: unknown): { rates: Rates; date?: string } {
  const rates: Rates = { USD: 1 };
  let date: string | undefined;
  if (Array.isArray(payload)) {
    for (const item of payload) {
      if (!item || typeof item !== "object") continue;
      const entry = item as { quote?: unknown; rate?: unknown; date?: unknown };
      if (
        typeof entry.quote === "string" &&
        typeof entry.rate === "number" &&
        Number.isFinite(entry.rate) &&
        entry.rate > 0
      )
        rates[entry.quote.toUpperCase()] = entry.rate;
      if (typeof entry.date === "string") date = entry.date;
    }
  } else if (payload && typeof payload === "object") {
    const value = payload as { rates?: unknown; date?: unknown };
    if (typeof value.date === "string") date = value.date;
    if (value.rates && typeof value.rates === "object") {
      for (const [currency, rate] of Object.entries(value.rates)) {
        if (typeof rate === "number" && Number.isFinite(rate) && rate > 0)
          rates[currency.toUpperCase()] = rate;
      }
    }
  }
  return { rates, date };
}

async function getFrankfurterRates(): Promise<RateSnapshot> {
  if (rateCache && rateCache.expiresAt > Date.now()) return rateCache;
  try {
    const response = await axios.get(FRANKFURTER_RATES_URL, { timeout: 5000 });
    const parsed = parseRates(response.data);
    rateCache = { ...parsed, expiresAt: Date.now() + RATE_CACHE_TTL_MS };
    return rateCache;
  } catch {
    if (rateCache) return rateCache;
    return { rates: { USD: 1 }, expiresAt: Date.now() + 5 * 60 * 1000 };
  }
}

export async function publicPricingCurrency(
  countryCurrency: string,
): Promise<{ currency: SupportedCurrency; rate: number; rateDate?: string }> {
  const currency = countryCurrency.toUpperCase() as SupportedCurrency;
  try {
    currencyMetadata(currency);
  } catch {
    return { currency: "USD", rate: 1 };
  }
  if (currency === "USD") return { currency, rate: 1 };
  const snapshot = await getFrankfurterRates();
  const rate = snapshot.rates[currency];
  return rate
    ? { currency, rate, rateDate: snapshot.date }
    : { currency: "USD", rate: 1, rateDate: snapshot.date };
}

export function convertPublicPrice(
  usdMajor: number,
  targetCurrency: SupportedCurrency,
  rate: number,
): number {
  if (targetCurrency === "USD") return usdMajor;
  const usdMinor = toMinorUnits(String(usdMajor), "USD");
  const convertedMajor = Number(fromMinorUnits(usdMinor, "USD")) * rate;
  const digits = currencyMetadata(targetCurrency).fractionDigits;
  const roundedMajor = convertedMajor.toFixed(digits);
  return Number(fromMinorUnits(toMinorUnits(roundedMajor, targetCurrency), targetCurrency));
}
