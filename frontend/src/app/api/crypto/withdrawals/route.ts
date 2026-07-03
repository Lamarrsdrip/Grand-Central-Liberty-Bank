import { NextRequest } from "next/server";
import { z } from "zod";
import { created, handleApi, ok } from "@/lib/api";
import { auditLog, notifyUser } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { plainText } from "@/lib/sanitize";
import { getAdminCryptoPrices, resolveRateFromMap } from "@/lib/crypto-prices";

const schema = z.object({
  asset: z.string().min(2).max(12),
  network: z.string().min(2).max(40),
  amount: z.coerce.number().positive(),
  recipientAddress: z.string().min(4).max(160),
  notes: z.string().max(500).optional()
});

export async function GET() {
  return handleApi(async () => {
    const user = await requireUser();
    const withdrawals = await prisma.cryptoWithdrawalRequest.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 30
    });
    return ok({ withdrawals });
  });
}

export async function POST(request: NextRequest) {
  return handleApi(async () => {
    const user = await requireUser();
    const input = schema.parse(await request.json());
    const asset = input.asset.toUpperCase();

    const cryptoBal = await prisma.userCryptoBalance.findUnique({
      where: { userId_symbol: { userId: user.id, symbol: asset } }
    });
    if (!cryptoBal || cryptoBal.balance < input.amount) {
      throw Object.assign(new Error(`Insufficient ${asset} balance.`), { status: 400 });
    }

    const reference = `CWDRAW-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

    const withdrawal = await prisma.cryptoWithdrawalRequest.create({
      data: {
        userId: user.id,
        asset,
        network: input.network,
        amount: input.amount,
        recipientAddress: plainText(input.recipientAddress, 160),
        notes: input.notes ? plainText(input.notes, 500) : null,
        status: "PENDING_REVIEW",
        adminMessage: "Transaction pending, contact support to approve withdrawal.",
        reference
      }
    });

    // Also record in CRYPTO account transaction history if account exists.
    // Transaction.amount/currency is always a USD ledger entry (see swap route) —
    // convert the coin quantity to its USD-equivalent value here so the wallet
    // history never shows a raw coin amount (e.g. 0.5) mislabeled as "$0.50".
    const cryptoAccount = await prisma.account.findFirst({ where: { userId: user.id, type: "CRYPTO" } });
    if (cryptoAccount) {
      try {
        const prices = await getAdminCryptoPrices();
        const rateUSD = resolveRateFromMap(asset, prices);
        if (rateUSD) {
          await prisma.transaction.create({
            data: {
              accountId: cryptoAccount.id,
              type: "CRYPTO_WITHDRAW",
              amount: -Math.abs(input.amount * rateUSD),
              currency: "USD",
              description: plainText(`Withdraw ${input.amount} ${asset} on ${input.network}`, 180),
              reference: `TX-${reference}`,
              status: "REVIEW"
            }
          });
        }
      } catch (err) {
        console.error("[crypto/withdrawals] transaction record failed:", err);
      }
    }

    await notifyUser(user.id, {
      type: "SYSTEM",
      title: "Crypto withdrawal submitted",
      body: "Your crypto withdrawal request is pending manual review. Contact support to approve."
    });

    await auditLog({
      actorId: user.id,
      action: "CRYPTO_WITHDRAW_REQUESTED",
      entity: "CryptoWithdrawalRequest",
      entityId: withdrawal.id,
      metadata: { asset, network: input.network, amount: input.amount, reference }
    });

    return created({ withdrawalId: withdrawal.id, reference });
  });
}
