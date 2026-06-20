import { NextRequest } from "next/server";
import { z } from "zod";
import { handleApi, ok } from "@/lib/api";
import { auditLog } from "@/lib/audit";
import { requireAdmin, requestIpAndAgent } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CRYPTO_RATES_USD } from "@/lib/swap-rates";

const SUPPORTED_ASSETS = Object.keys(CRYPTO_RATES_USD);

const priceSchema = z.object({
  symbol: z.string().min(2).max(10).toUpperCase(),
  priceUSD: z.coerce.number().positive("Price must be positive")
});

export async function GET() {
  return handleApi(async () => {
    await requireAdmin();
    const dbPrices = await prisma.cryptoAssetPrice.findMany({ orderBy: { symbol: "asc" } });
    const priceMap: Record<string, number> = { ...CRYPTO_RATES_USD };
    for (const p of dbPrices) priceMap[p.symbol.toUpperCase()] = p.priceUSD;
    const prices = SUPPORTED_ASSETS.map(symbol => ({
      symbol,
      priceUSD: priceMap[symbol],
      isCustom: dbPrices.some(p => p.symbol === symbol)
    }));
    return ok({ prices });
  });
}

export async function POST(request: NextRequest) {
  return handleApi(async () => {
    const admin = await requireAdmin();
    const input = priceSchema.parse(await request.json());
    const { ip, userAgent } = await requestIpAndAgent();

    const previous = await prisma.cryptoAssetPrice.findUnique({ where: { symbol: input.symbol } });

    const price = await prisma.cryptoAssetPrice.upsert({
      where: { symbol: input.symbol },
      create: { symbol: input.symbol, priceUSD: input.priceUSD },
      update: { priceUSD: input.priceUSD }
    });

    await auditLog({
      actorId: admin.id,
      action: "ADMIN_CRYPTO_PRICE_SET",
      entity: "CryptoAssetPrice",
      entityId: price.id,
      metadata: {
        symbol: input.symbol,
        priceUSD: input.priceUSD,
        previousPriceUSD: previous?.priceUSD ?? CRYPTO_RATES_USD[input.symbol] ?? null
      },
      ip,
      userAgent
    });

    return ok({ price });
  });
}
