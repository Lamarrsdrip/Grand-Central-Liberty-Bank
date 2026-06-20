import { NextRequest } from "next/server";
import { z } from "zod";
import { handleApi, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getAdminCryptoPrices, resolveRateFromMap } from "@/lib/crypto-prices";
import { SWAP_FEE_PERCENT } from "@/lib/swap-rates";

const schema = z.object({
  fromAsset: z.string().min(2).max(10),
  toAsset: z.string().min(2).max(10),
  fromAmount: z.number().positive()
});

export async function POST(request: NextRequest) {
  return handleApi(async () => {
    await requireUser();
    const input = schema.parse(await request.json());
    const { fromAsset, toAsset, fromAmount } = input;

    const cryptoPrices = await getAdminCryptoPrices();
    const fromRateUSD = resolveRateFromMap(fromAsset.toUpperCase(), cryptoPrices);
    const toRateUSD = resolveRateFromMap(toAsset.toUpperCase(), cryptoPrices);

    if (!fromRateUSD || !toRateUSD) {
      throw Object.assign(new Error("No exchange rate available for this asset pair."), { status: 422 });
    }

    const valueUSD = fromAmount * fromRateUSD;
    const feeAmount = valueUSD * (SWAP_FEE_PERCENT / 100);
    const netValueUSD = valueUSD - feeAmount;
    const toAmount = netValueUSD / toRateUSD;
    const rate = fromRateUSD / toRateUSD;

    return ok({
      fromAsset: fromAsset.toUpperCase(),
      toAsset: toAsset.toUpperCase(),
      fromAmount,
      toAmount: parseFloat(toAmount.toFixed(8)),
      rate: parseFloat(rate.toFixed(8)),
      feeAmount: parseFloat(feeAmount.toFixed(4)),
      feeCurrency: "USD",
      feePercent: SWAP_FEE_PERCENT
    });
  });
}
