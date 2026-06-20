import { NextRequest } from "next/server";
import { z } from "zod";
import { handleApi, ok } from "@/lib/api";
import { auditLog, notifyUser } from "@/lib/audit";
import { requireAdmin, requestIpAndAgent } from "@/lib/auth";
import { prisma } from "@/lib/db";

function genRef(prefix: string) {
  return `${prefix}-${crypto.randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase()}`;
}

const adjustSchema = z.object({
  symbol: z.string().min(2).max(10).toUpperCase(),
  amount: z.number().refine(n => n !== 0, "Amount cannot be zero"),
  reason: z.string().min(5, "Reason required (min 5 characters)")
});

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    await requireAdmin();
    const { id } = await context.params;
    const balances = await prisma.userCryptoBalance.findMany({
      where: { userId: id },
      orderBy: { symbol: "asc" }
    });
    return ok({ balances });
  });
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const admin = await requireAdmin();
    const { id: userId } = await context.params;
    const input = adjustSchema.parse(await request.json());
    const { ip, userAgent } = await requestIpAndAgent();

    const existing = await prisma.userCryptoBalance.findUnique({
      where: { userId_symbol: { userId, symbol: input.symbol } }
    });

    const currentBalance = existing?.balance ?? 0;
    const newBalance = currentBalance + input.amount;

    if (newBalance < 0) {
      throw Object.assign(new Error(`Insufficient balance. Current: ${currentBalance} ${input.symbol}`), { status: 400 });
    }

    const updated = await prisma.userCryptoBalance.upsert({
      where: { userId_symbol: { userId, symbol: input.symbol } },
      create: { userId, symbol: input.symbol, balance: newBalance },
      update: { balance: newBalance }
    });

    // Post a transaction record on the crypto account for the ledger
    const cryptoAccount = await prisma.account.findFirst({
      where: { userId, type: "CRYPTO" }
    });

    if (cryptoAccount) {
      const reference = genRef("ADMIN-CRYPTO");
      await prisma.transaction.create({
        data: {
          accountId: cryptoAccount.id,
          type: input.amount > 0 ? "ADMIN_CRYPTO_CREDIT" : "ADMIN_CRYPTO_DEBIT",
          amount: Math.abs(input.amount),
          currency: input.symbol,
          description: `Admin ${input.amount > 0 ? "top-up" : "deduction"}: ${input.symbol} — ${input.reason}`,
          reference,
          status: "POSTED"
        }
      });
    }

    await notifyUser(userId, {
      type: "CRYPTO_BALANCE_ADJUSTED",
      title: `Crypto balance updated`,
      body: `Your ${input.symbol} balance was ${input.amount > 0 ? "credited" : "debited"} by ${Math.abs(input.amount)} ${input.symbol}. Reason: ${input.reason}`
    });

    await auditLog({
      actorId: admin.id,
      action: "ADMIN_CRYPTO_BALANCE_ADJUSTED",
      entity: "UserCryptoBalance",
      entityId: updated.id,
      metadata: { userId, symbol: input.symbol, amount: input.amount, previousBalance: currentBalance, newBalance, reason: input.reason },
      ip,
      userAgent
    });

    return ok({ balance: updated, previousBalance: currentBalance, newBalance });
  });
}
