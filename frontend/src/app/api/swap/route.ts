import { NextRequest } from "next/server";
import { z } from "zod";
import { handleApi, ok } from "@/lib/api";
import { auditLog, notifyUser } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getAdminCryptoPrices, resolveRateFromMap } from "@/lib/crypto-prices";
import { SWAP_FEE_PERCENT, isFiatAsset } from "@/lib/swap-rates";

function genRef(prefix: string) {
  return `${prefix}-${crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

const schema = z.object({
  fromAsset: z.string().min(2).max(10),
  toAsset: z.string().min(2).max(10),
  fromAmount: z.number().positive(),
  confirmedRate: z.number().positive()
});

export async function POST(request: NextRequest) {
  return handleApi(async () => {
    const user = await requireUser();
    const input = schema.parse(await request.json());
    const fromAsset = input.fromAsset.toUpperCase();
    const toAsset = input.toAsset.toUpperCase();
    const { fromAmount } = input;

    const cryptoPrices = await getAdminCryptoPrices();
    const fromRateUSD = resolveRateFromMap(fromAsset, cryptoPrices);
    const toRateUSD = resolveRateFromMap(toAsset, cryptoPrices);
    if (!fromRateUSD || !toRateUSD) {
      throw Object.assign(new Error("No exchange rate available for this pair."), { status: 422 });
    }

    const valueUSD = fromAmount * fromRateUSD;
    const feeAmount = valueUSD * (SWAP_FEE_PERCENT / 100);
    const netValueUSD = valueUSD - feeAmount;
    const toAmount = netValueUSD / toRateUSD;

    // ── Deduct from source ──────────────────────────────
    if (isFiatAsset(fromAsset)) {
      // Try by currency match first, fallback to first active checking/savings
      let account = await prisma.account.findFirst({
        where: { userId: user.id, currency: fromAsset, status: "ACTIVE", type: { in: ["CHECKING", "SAVINGS"] } }
      });
      if (!account) {
        account = await prisma.account.findFirst({
          where: { userId: user.id, status: "ACTIVE", type: { in: ["CHECKING", "SAVINGS"] } }
        });
      }
      if (!account) throw Object.assign(new Error("Source fiat account not found."), { status: 400 });
      if (Number(account.availableBalance) < fromAmount) {
        throw Object.assign(new Error("Insufficient fiat balance."), { status: 400 });
      }
      await prisma.account.update({
        where: { id: account.id },
        data: {
          balance: { increment: -fromAmount },
          availableBalance: { increment: -fromAmount }
        }
      });
      await prisma.transaction.create({
        data: {
          accountId: account.id,
          type: "SWAP_OUT",
          amount: fromAmount,
          currency: fromAsset,
          description: `Swap ${fromAmount} ${fromAsset} → ${toAsset}`,
          reference: genRef("SWAP-OUT"),
          status: "POSTED"
        }
      });
    } else {
      const cryptoBal = await prisma.userCryptoBalance.findUnique({
        where: { userId_symbol: { userId: user.id, symbol: fromAsset } }
      });
      if (!cryptoBal || cryptoBal.balance < fromAmount) {
        throw Object.assign(new Error(`Insufficient ${fromAsset} balance.`), { status: 400 });
      }
      await prisma.userCryptoBalance.update({
        where: { userId_symbol: { userId: user.id, symbol: fromAsset } },
        data: { balance: { increment: -fromAmount } }
      });
    }

    // ── Credit to destination ────────────────────────────
    if (isFiatAsset(toAsset)) {
      let account = await prisma.account.findFirst({
        where: { userId: user.id, currency: toAsset, status: "ACTIVE", type: { in: ["CHECKING", "SAVINGS"] } }
      });
      if (!account) {
        account = await prisma.account.findFirst({
          where: { userId: user.id, status: "ACTIVE", type: { in: ["CHECKING", "SAVINGS"] } }
        });
      }
      if (!account) throw Object.assign(new Error("Destination fiat account not found."), { status: 400 });
      await prisma.account.update({
        where: { id: account.id },
        data: {
          balance: { increment: toAmount },
          availableBalance: { increment: toAmount }
        }
      });
      await prisma.transaction.create({
        data: {
          accountId: account.id,
          type: "SWAP_IN",
          amount: toAmount,
          currency: toAsset,
          description: `Swap received: ${toAmount.toFixed(4)} ${toAsset} from ${fromAsset}`,
          reference: genRef("SWAP-IN"),
          status: "POSTED"
        }
      });
    } else {
      await prisma.userCryptoBalance.upsert({
        where: { userId_symbol: { userId: user.id, symbol: toAsset } },
        create: { userId: user.id, symbol: toAsset, balance: toAmount },
        update: { balance: { increment: toAmount } }
      });
    }

    // ── Record swap ─────────────────────────────────────
    const swapRef = `SWAP-${crypto.randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase()}`;
    const swap = await prisma.swapTransaction.create({
      data: {
        userId: user.id,
        fromAsset,
        toAsset,
        fromAmount,
        toAmount,
        rate: fromRateUSD / toRateUSD,
        feeAmount,
        feeCurrency: "USD",
        reference: swapRef
      }
    });

    await notifyUser(user.id, {
      type: "SWAP_COMPLETED",
      title: "Swap completed",
      body: `Swapped ${fromAmount} ${fromAsset} → ${toAmount.toFixed(6)} ${toAsset}`
    });

    await auditLog({
      actorId: user.id,
      action: "USER_SWAP",
      entity: "SwapTransaction",
      entityId: swap.id,
      metadata: { fromAsset, toAsset, fromAmount, toAmount, feeAmount }
    });

    return ok({ swap, toAmount: parseFloat(toAmount.toFixed(8)), reference: swapRef });
  });
}

export async function GET() {
  return handleApi(async () => {
    const user = await requireUser();
    const swaps = await prisma.swapTransaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50
    });
    return ok({ swaps });
  });
}
