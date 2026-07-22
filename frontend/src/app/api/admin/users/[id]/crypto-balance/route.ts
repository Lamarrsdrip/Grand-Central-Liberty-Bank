import { NextRequest } from "next/server";
import { z } from "zod";
import { handleApi, ok } from "@/lib/api";
import { auditLog, notifyUser } from "@/lib/audit";
import { requireAdmin, requestIpAndAgent } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendTransactionalEmail } from "@/lib/transactional-email";

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
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, firstName: true, lastName: true } });
    if (!user) throw Object.assign(new Error("User was not found."), { status: 404 });

    const existing = await prisma.userCryptoBalance.findUnique({
      where: { userId_symbol: { userId, symbol: input.symbol } }
    });

    const currentBalance = Number(existing?.balance ?? 0);
    const newBalance = currentBalance + input.amount;

    if (newBalance < 0) {
      throw Object.assign(new Error(`Insufficient balance. Current: ${currentBalance} ${input.symbol}`), { status: 400 });
    }

    const cryptoAccount = await prisma.account.findFirst({
      where: { userId, type: "CRYPTO" }
    });
    const reference = genRef("ADMIN-CRYPTO");
    const updated = await prisma.$transaction(async (tx) => {
      if (input.amount < 0) {
        const changed = await tx.userCryptoBalance.updateMany({
          where: { userId, symbol: input.symbol, balance: { gte: Math.abs(input.amount) } },
          data: { balance: { decrement: Math.abs(input.amount) } }
        });
        if (changed.count !== 1) throw Object.assign(new Error(`Insufficient ${input.symbol} balance.`), { status: 409 });
      } else {
        await tx.userCryptoBalance.upsert({
          where: { userId_symbol: { userId, symbol: input.symbol } },
          create: { userId, symbol: input.symbol, balance: input.amount },
          update: { balance: { increment: input.amount } }
        });
      }
      if (cryptoAccount) {
        await tx.transaction.create({
          data: {
            accountId: cryptoAccount.id,
            type: input.amount > 0 ? "ADMIN_CRYPTO_CREDIT" : "ADMIN_CRYPTO_DEBIT",
            amount: input.amount,
            currency: input.symbol,
            description: `Admin ${input.amount > 0 ? "top-up" : "deduction"}: ${input.symbol} — ${input.reason}`,
            reference,
            status: "POSTED"
          }
        });
      }
      return tx.userCryptoBalance.findUniqueOrThrow({ where: { userId_symbol: { userId, symbol: input.symbol } } });
    });

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
      metadata: { userId, symbol: input.symbol, amount: input.amount, previousBalance: currentBalance, newBalance: updated.balance, reason: input.reason, reference },
      ip,
      userAgent
    });
    await sendTransactionalEmail({
      event: "ADMIN_BALANCE_ADJUSTMENT", to: user.email, idempotencyKey: `admin-crypto-adjustment:${reference}`,
      relatedUserId: userId, relatedEntityType: "UserCryptoBalance", relatedEntityId: updated.id,
      data: { customerName: `${user.firstName} ${user.lastName}`, transactionType: input.amount > 0 ? "Crypto balance credit" : "Crypto balance debit", amount: Math.abs(input.amount), currency: input.symbol, status: "POSTED", transactionReference: reference, explanation: input.reason, timestamp: new Date(), nextStep: "Review your crypto balances and contact support if you have questions." }
    });

    return ok({ balance: updated, previousBalance: currentBalance, newBalance: updated.balance });
  });
}
