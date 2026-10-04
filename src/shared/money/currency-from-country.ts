const COUNTRY_CURRENCY: Record<string, string> = {
  NG: "NGN",
  GH: "GHS",
  KE: "KES",
  ZA: "ZAR",
  CI: "XOF",
  US: "USD",
  CA: "USD",
  GB: "GBP",
  IE: "EUR",
  FR: "EUR",
  DE: "EUR",
  ES: "EUR",
  IT: "EUR",
  PT: "EUR",
  NL: "EUR",
  BE: "EUR",
  JP: "JPY",
};

export function currencyFromCountry(country?: string): string {
  return COUNTRY_CURRENCY[country?.trim().toUpperCase() ?? ""] ?? "NGN";
}
