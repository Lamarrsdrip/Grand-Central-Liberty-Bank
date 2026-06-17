import { NextRequest } from "next/server";
import { z } from "zod";
import { created, handleApi } from "@/lib/api";
import { auditLog, notifyUser } from "@/lib/audit";
import { requireAdmin, requestIpAndAgent } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { plainText } from "@/lib/sanitize";

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
    const nextBalance = Math.round((Number(account.balance) + signed) * 100) / 100;
    const nextAvailable = Math.round((Number(account.availableBalance) + signed) * 100) / 100;
    if (!input.allowNegative && (nextBalance < 0 || nextAvailable < 0)) {
      throw new Response("Adjustment would create a negative balance. Enable authorized negative balance to continue.", { status: 400 });
    }

    const transaction = await prisma.transaction.create({
      data: {
        accountId: account.id,
        type: input.action === "TOP_UP" ? "ADMIN_TOP_UP" : "ADMIN_DEDUCT",
        amount: signed,
        currency: account.currency,
        description: plainText(input.reason, 180),
        reference: `ADMIN-${Date.now()}-${account.id.slice(-5).toUpperCase()}`,
        status: "POSTED"
      }
    });
    const updated = await prisma.account.update({
      where: { id: account.id },
      data: {
        balance: nextBalance,
        availableBalance: nextAvailable
      }
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
        nextBalance
      },
      ip,
      userAgent
    });

    return created({ account: updated, transaction });
  });
}
