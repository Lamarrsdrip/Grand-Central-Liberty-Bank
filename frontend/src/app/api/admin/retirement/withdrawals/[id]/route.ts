import { NextRequest } from "next/server";
import { z } from "zod";
import { handleApi, ok } from "@/lib/api";
import { auditLog, notifyUser } from "@/lib/audit";
import { requireAdmin, requestIpAndAgent } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendTransactionalEmail } from "@/lib/transactional-email";

const schema = z.object({
  status: z.enum(["UNDER_REVIEW", "APPROVED", "REJECTED", "INFO_REQUESTED"]),
  internalNote: z.string().min(3),
  userNote: z.string().optional()
});

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const admin = await requireAdmin();
    const { id } = await context.params;
    const input = schema.parse(await request.json());
    const { ip, userAgent } = await requestIpAndAgent();
    const existing = await prisma.retirementWithdrawalRequest.findUnique({ where: { id }, include: { user: true, retirementAccount: true } });
    if (!existing) throw new Response("401(k) withdrawal request was not found.", { status: 404 });
    if (["APPROVED", "REJECTED"].includes(existing.status)) throw new Response(`This request is already ${existing.status.toLowerCase()}.`, { status: 409 });
    const withdrawal = await prisma.retirementWithdrawalRequest.update({
      where: { id },
      data: {
        status: input.status,
        internalNote: input.internalNote,
        reviewedById: admin.id,
        reviewedAt: new Date()
      }
    });
    try {
      await prisma.retirementWithdrawalNote.create({
        data: {
          retirementWithdrawalRequestId: id,
          authorId: admin.id,
          body: input.internalNote,
          visibleToUser: false
        }
      });
    } catch (error) {
      console.error("[admin] retirementWithdrawalNote (internal) create failed:", error);
    }
    if (input.userNote) {
      try {
        await prisma.retirementWithdrawalNote.create({
          data: {
            retirementWithdrawalRequestId: id,
            authorId: admin.id,
            body: input.userNote,
            visibleToUser: true
          }
        });
      } catch (error) {
        console.error("[admin] retirementWithdrawalNote (user) create failed:", error);
      }
    }

    await notifyUser(withdrawal.userId, {
      type: "SYSTEM",
      title: `401(k) withdrawal ${input.status.replace("_", " ").toLowerCase()}`,
      body: input.userNote ?? input.internalNote
    });
    await auditLog({
      actorId: admin.id,
      action: "ADMIN_REVIEWED_RETIREMENT_WITHDRAWAL",
      entity: "RetirementWithdrawalRequest",
      entityId: id,
      metadata: { status: input.status, internalNote: input.internalNote, userNote: input.userNote },
      ip,
      userAgent
    });
    await sendTransactionalEmail({
      event: "RETIREMENT_ACTION", to: existing.user.email, idempotencyKey: `retirement-withdrawal-status:${id}:${input.status}`,
      relatedUserId: existing.userId, relatedEntityType: "RetirementWithdrawalRequest", relatedEntityId: id,
      data: { customerName: `${existing.user.firstName} ${existing.user.lastName}`, transactionType: "401(k) withdrawal request", amount: existing.amount, currency: existing.currency, status: input.status, maskedAccount: `•••• ${existing.retirementAccount.accountNumber.slice(-4)}`, transactionReference: `RET-${id.slice(-8).toUpperCase()}`, explanation: input.userNote ?? "Your withdrawal status was updated.", timestamp: withdrawal.updatedAt, nextStep: input.status === "APPROVED" ? "No further action is required." : "Review your secure 401(k) activity and contact support if needed." }
    });

    return ok({ withdrawal });
  });
}
