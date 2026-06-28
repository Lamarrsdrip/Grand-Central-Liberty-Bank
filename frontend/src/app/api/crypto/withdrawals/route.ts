import { NextRequest } from "next/server";
import { z } from "zod";
import { created, handleApi, ok } from "@/lib/api";
import { auditLog, notifyUser } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { plainText } from "@/lib/sanitize";

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

    const reference = `CWDRAW-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

    const withdrawal = await prisma.cryptoWithdrawalRequest.create({
      data: {
        userId: user.id,
        asset: input.asset,
        network: input.network,
        amount: input.amount,
        recipientAddress: plainText(input.recipientAddress, 160),
        notes: input.notes ? plainText(input.notes, 500) : null,
        status: "PENDING_REVIEW",
        adminMessage: "Transaction pending, contact support to approve withdrawal.",
        reference
      }
    });

    // Also record in CRYPTO account transaction history if account exists
    const cryptoAccount = await prisma.account.findFirst({ where: { userId: user.id, type: "CRYPTO" } });
    if (cryptoAccount) {
      try {
        await prisma.transaction.create({
          data: {
            accountId: cryptoAccount.id,
            type: "CRYPTO_WITHDRAW",
            amount: -Math.abs(input.amount),
            currency: "USD",
            description: plainText(`Withdraw ${input.asset} on ${input.network}`, 180),
            reference: `TX-${reference}`,
            status: "REVIEW"
          }
        });
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
      metadata: { asset: input.asset, network: input.network, amount: input.amount, reference }
    });

    return created({ withdrawalId: withdrawal.id, reference });
  });
}
