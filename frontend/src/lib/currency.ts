/**
 * Static exchange rates relative to USD.
 * Used for display conversion only — not for actual financial transactions.
 * Rates are approximate and updated periodically; actual balances are stored in USD.
 */
export const FX_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  CAD: 1.37,
  AUD: 1.55,
  CHF: 0.90,
  JPY: 155,
  CNY: 7.24,
  INR: 83.5,
  BRL: 5.10,
  NGN: 1600,
  ZAR: 18.8,
  KRW: 1375,
  MXN: 17.1,
  AED: 3.67,
  GHS: 15.8,
  KES: 130,
  SEK: 10.6,
  NOK: 10.7,
  DKK: 6.90,
  PLN: 4.02,
  TRY: 32.8,
  RUB: 90,
  SGD: 1.35,
  HKD: 7.82,
  NZD: 1.64,
  MYR: 4.70,
  PHP: 57,
  THB: 36,
  IDR: 15800,
  VND: 24500,
  EGP: 48,
  MAD: 10.1,
  PKR: 278,
  BDT: 110,
  UAH: 38,
  ILS: 3.74,
  TZS: 2600,
  UGX: 3800,
  ETB: 57,
  XOF: 600,
  XAF: 600,
};

/** Convert a USD amount to the target currency for display */
export function convertFromUsd(amountUsd: number, toCurrency: string): number {
  const rate = FX_RATES[toCurrency] ?? 1;
  return amountUsd * rate;
}

/** Format a USD amount in the user's preferred currency */
export function formatInCurrency(amountUsd: number, currency: string): string {
  const converted = convertFromUsd(amountUsd, currency);
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: currency === "JPY" || currency === "KRW" || currency === "IDR" || currency === "VND" ? 0 : 2,
    }).format(converted);
  } catch {
    return `${currency} ${converted.toFixed(2)}`;
  }
}

/** Get the currency symbol for a given currency code */
export function getCurrencySymbol(currency: string): string {
  try {
    const parts = new Intl.NumberFormat("en-US", { style: "currency", currency }).formatToParts(0);
    return parts.find((p) => p.type === "currency")?.value ?? currency;
  } catch {
    return currency;
  }
}

/** Compact format for large numbers in the user's preferred currency */
export function compactInCurrency(amountUsd: number, currency: string): string {
  const converted = convertFromUsd(amountUsd, currency);
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(converted);
  } catch {
    return formatInCurrency(amountUsd, currency);
  }
}
