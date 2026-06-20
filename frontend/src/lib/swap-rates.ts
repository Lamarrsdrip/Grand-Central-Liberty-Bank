export const SWAP_FEE_PERCENT = 0.5;

export const CRYPTO_RATES_USD: Record<string, number> = {
  BTC: 68000,
  ETH: 3800,
  USDT: 1,
  USDC: 1,
  SOL: 185,
  BNB: 600,
  XRP: 0.62,
  DOGE: 0.18,
  ADA: 0.45,
  DOT: 7.50,
  LTC: 82,
  AVAX: 35
};

export const FIAT_CURRENCIES = ["USD", "EUR", "GBP", "NGN", "CAD", "AUD", "JPY", "CHF"];

const FIAT_TO_USD: Record<string, number> = {
  USD: 1,
  EUR: 1.08,
  GBP: 1.26,
  NGN: 0.00065,
  CAD: 0.74,
  AUD: 0.65,
  JPY: 0.0064,
  CHF: 1.11
};

export function isFiatAsset(symbol: string): boolean {
  return FIAT_CURRENCIES.includes(symbol.toUpperCase());
}

export function resolveRateUSD(symbol: string): number | null {
  const upper = symbol.toUpperCase();
  if (CRYPTO_RATES_USD[upper] !== undefined) return CRYPTO_RATES_USD[upper];
  if (FIAT_TO_USD[upper] !== undefined) return FIAT_TO_USD[upper];
  return null;
}
