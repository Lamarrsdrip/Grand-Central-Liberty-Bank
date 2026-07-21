import { NextRequest } from "next/server";
import { z } from "zod";
import { handleApi, ok } from "@/lib/api";
import { auditLog, notifyUser } from "@/lib/audit";
import { requireAdmin, requestIpAndAgent } from "@/lib/auth";
import { prisma } from "@/lib/db";

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

    const existing = await prisma.cryptoWithdrawalRequest.findUnique({ where: { id } });
    if (!existing) {
      throw Object.assign(new Error("Withdrawal request not found."), { status: 404 });
    }
    if (existing.status === "APPROVED") {
      throw Object.assign(new Error("This withdrawal has already been approved."), { status: 409 });
    }

    // Approving a crypto withdrawal must actually debit the user's ledger balance —
    // otherwise the user's wallet/dashboard keep showing coins that were already
    // sent off-platform. Use a conditional update as an atomic funds check so two
    // concurrent approval calls can't both succeed against the same balance.
    if (input.status === "APPROVED") {
      const debited = await prisma.userCryptoBalance.updateMany({
        where: {
          userId: existing.userId,
          symbol: existing.asset,
          balance: { gte: existing.amount }
        },
        data: { balance: { decrement: existing.amount } }
      });
      if (debited.count === 0) {
        throw Object.assign(
          new Error(`Cannot approve: user does not have sufficient ${existing.asset} balance.`),
          { status: 400 }
        );
      }
    }

    const withdrawal = await prisma.cryptoWithdrawalRequest.update({
      where: { id },
      data: { status: input.status, adminMessage: input.adminMessage }
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

    return ok({ withdrawal });
  });
}
