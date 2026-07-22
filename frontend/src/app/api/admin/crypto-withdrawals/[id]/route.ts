import { NextRequest } from "next/server";
import { z } from "zod";
import { handleApi, ok } from "@/lib/api";
import { auditLog, notifyUser } from "@/lib/audit";
import { requireAdmin, requestIpAndAgent } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendTransactionalEmail } from "@/lib/transactional-email";

const schema = z.object({
  status: z.enum(["PENDING_REVIEW", "APPROVED", "FAILED"]),
  adminMessage: z.string().min(1).max(500)
});

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const admin = await requireAdmin();
    const { id } = await context.params;
    const input = schema.parse(await request.json());
    const { ip, userAgent } = await requestIpAndAgent();

    const existing = await prisma.cryptoWithdrawalRequest.findUnique({ where: { id }, include: { user: true } });
    if (!existing) {
      throw Object.assign(new Error("Withdrawal request not found."), { status: 404 });
    }
    if (["APPROVED", "FAILED"].includes(existing.status)) {
      throw Object.assign(new Error(`This withdrawal is already ${existing.status.toLowerCase()}.`), { status: 409 });
    }

    // Approving a crypto withdrawal must actually debit the user's ledger balance —
    // otherwise the user's wallet/dashboard keep showing coins that were already
    // sent off-platform. Use a conditional update as an atomic funds check so two
    // concurrent approval calls can't both succeed against the same balance.
    const withdrawal = await prisma.$transaction(async (tx) => {
      const claimed = await tx.cryptoWithdrawalRequest.updateMany({
        where: { id, status: { notIn: ["APPROVED", "FAILED"] } },
        data: { status: "PENDING_REVIEW", adminMessage: input.adminMessage }
      });
      if (claimed.count !== 1) throw Object.assign(new Error("Withdrawal was finalized by another reviewer."), { status: 409 });
      if (input.status === "APPROVED") {
        const debited = await tx.userCryptoBalance.updateMany({
          where: { userId: existing.userId, symbol: existing.asset, balance: { gte: existing.amount } },
          data: { balance: { decrement: existing.amount } }
        });
        if (debited.count !== 1) throw Object.assign(new Error(`Cannot approve: user does not have sufficient ${existing.asset} balance.`), { status: 400 });
      }
      return tx.cryptoWithdrawalRequest.update({ where: { id }, data: { status: input.status, adminMessage: input.adminMessage } });
    });

    const statusLabel =
      input.status === "PENDING_REVIEW" ? "pending review" :
      input.status === "APPROVED" ? "approved" : "failed";

    await notifyUser(withdrawal.userId, {
      type: "SYSTEM",
      title: `Crypto withdrawal ${statusLabel}`,
      body: input.adminMessage
    });

    await auditLog({
      actorId: admin.id,
      action: "ADMIN_CRYPTO_WITHDRAWAL_UPDATED",
      entity: "CryptoWithdrawalRequest",
      entityId: id,
      metadata: { status: input.status, adminMessage: input.adminMessage },
      ip,
      userAgent
    });
    await sendTransactionalEmail({
      event: input.status === "APPROVED" ? "CRYPTO_WITHDRAWAL_APPROVED" : input.status === "FAILED" ? "CRYPTO_WITHDRAWAL_FAILED" : "CRYPTO_WITHDRAWAL_PENDING",
      to: existing.user.email, idempotencyKey: `crypto-withdrawal-status:${id}:${input.status}`,
      relatedUserId: existing.userId, relatedEntityType: "CryptoWithdrawalRequest", relatedEntityId: id,
      data: { customerName: `${existing.user.firstName} ${existing.user.lastName}`, transactionType: `${existing.asset} withdrawal on ${existing.network}`, amount: existing.amount, currency: existing.asset, status: input.status, transactionReference: existing.reference, explanation: input.adminMessage, timestamp: withdrawal.updatedAt, nextStep: input.status === "APPROVED" ? "Your approved withdrawal is being completed." : "Review the status note and contact support if needed." }
    });

    return ok({ withdrawal });
  });
}
