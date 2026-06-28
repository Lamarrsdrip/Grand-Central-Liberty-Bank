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
