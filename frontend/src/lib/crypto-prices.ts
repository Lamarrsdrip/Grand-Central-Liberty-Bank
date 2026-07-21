import { prisma } from "@/lib/db";
import { CRYPTO_RATES_USD, FIAT_TO_USD } from "@/lib/swap-rates";

export async function getAdminCryptoPrices(): Promise<Record<string, number>> {
  const records = await prisma.cryptoAssetPrice.findMany().catch(() => []);
  const prices = { ...CRYPTO_RATES_USD };
  for (const r of records) {
    prices[r.symbol.toUpperCase()] = r.priceUSD;
  }
  return prices;
}

export function resolveRateFromMap(
  symbol: string,
  cryptoPrices: Record<string, number>
): number | null {
  const upper = symbol.toUpperCase();
  if (cryptoPrices[upper] !== undefined) return cryptoPrices[upper];
  if (FIAT_TO_USD[upper] !== undefined) return FIAT_TO_USD[upper];
  return null;
}

export function computeCryptoTotalUSD(
  balances: Array<{ symbol: string; balance: number }>,
  prices: Record<string, number>
): number {
  return balances.reduce((total, b) => {
    const price = prices[b.symbol.toUpperCase()] ?? 0;
    return total + b.balance * price;
  }, 0);
}
