import { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { created, handleApi } from "@/lib/api";
import { auditLog, notifyUser } from "@/lib/audit";
import { requireAdmin, requestIpAndAgent } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { plainText } from "@/lib/sanitize";
import { sendTransactionalEmail } from "@/lib/transactional-email";

const schema = z.object({
  userId: z.string().min(1),
  accountId: z.string().min(1),
  action: z.enum(["TOP_UP", "DEDUCT"]),
  amount: z.coerce.number().positive(),
  reason: z.string().min(5),
  allowNegative: z.boolean().default(false)
});

export async function POST(request: NextRequest) {
  return handleApi(async () => {
    const admin = await requireAdmin();
    const input = schema.parse(await request.json());
    const { ip, userAgent } = await requestIpAndAgent();
    const account = await prisma.account.findFirst({
      where: { id: input.accountId, userId: input.userId },
      include: { user: true }
    });
    if (!account) {
      throw new Response("Account was not found for the selected user.", { status: 404 });
    }

    const signed = input.action === "TOP_UP" ? input.amount : -input.amount;
    // Always coerce stored balance to number — guards against Decimal128 or string edge cases
    const currentBalance = Number(account.balance);
    const currentAvailable = Number(account.availableBalance);
    if (!Number.isFinite(currentBalance) || !Number.isFinite(currentAvailable)) {
      throw new Response("Account balance data is corrupted. Contact technical operations.", { status: 500 });
    }
    const nextBalance = Math.round((currentBalance + signed) * 100) / 100;
    const nextAvailable = Math.round((currentAvailable + signed) * 100) / 100;
    if (!input.allowNegative && (nextBalance < 0 || nextAvailable < 0)) {
      throw new Response("Adjustment would create a negative balance. Enable authorized negative balance to continue.", { status: 400 });
    }

    const { transaction, updated } = await prisma.$transaction(async (tx) => {
      const changed = await tx.account.updateMany({
        where: {
          id: account.id,
          userId: input.userId,
          ...(!input.allowNegative && input.action === "DEDUCT"
            ? { balance: { gte: input.amount }, availableBalance: { gte: input.amount } }
            : {})
        },
        data: input.action === "TOP_UP"
          ? { balance: { increment: input.amount }, availableBalance: { increment: input.amount } }
          : { balance: { decrement: input.amount }, availableBalance: { decrement: input.amount } }
      });
      if (changed.count !== 1) {
        throw new Response("The balance changed before this adjustment could be committed. Refresh and try again.", { status: 409 });
      }
      const transaction = await tx.transaction.create({
        data: {
          accountId: account.id,
          type: input.action === "TOP_UP" ? "ADMIN_TOP_UP" : "ADMIN_DEDUCT",
          amount: signed,
          currency: account.currency,
          description: plainText(input.reason, 180),
          reference: `ADMIN-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`,
          status: "POSTED"
        }
      });
      const updated = await tx.account.findUniqueOrThrow({ where: { id: account.id } });
      return { transaction, updated };
    });

    await notifyUser(account.userId, {
      type: "SYSTEM",
      title: "Account balance updated",
      body: plainText(input.reason, 180)
    });
    await auditLog({
      actorId: admin.id,
      action: "ADMIN_ADJUSTED_BALANCE",
      entity: "Account",
      entityId: account.id,
      metadata: {
        action: input.action,
        amount: input.amount,
        reason: input.reason,
        transactionId: transaction.id,
        previousBalance: account.balance,
        nextBalance: updated.balance
      },
      ip,
      userAgent
    });
    await sendTransactionalEmail({
      event: "ADMIN_BALANCE_ADJUSTMENT", to: account.user.email,
      idempotencyKey: `admin-balance-adjustment:${transaction.id}`,
      relatedUserId: account.userId, relatedEntityType: "Transaction", relatedEntityId: transaction.id,
      data: {
        customerName: `${account.user.firstName} ${account.user.lastName}`,
        transactionType: input.action === "TOP_UP" ? "Balance credit" : "Balance debit",
        amount: input.amount, currency: account.currency, status: "POSTED",
        maskedAccount: `•••• ${account.accountNumber.slice(-4)}`, transactionReference: transaction.reference,
        timestamp: transaction.createdAt, explanation: plainText(input.reason, 180),
        nextStep: "Review the adjustment in your transaction history and contact support if you have questions."
      }
    });

    return created({ account: updated, transaction });
  });
}
