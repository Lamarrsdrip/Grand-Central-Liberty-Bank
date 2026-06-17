import { NextRequest } from "next/server";
import { z } from "zod";
import { handleApi, ok } from "@/lib/api";
import { auditLog, notifyUser } from "@/lib/audit";
import { requireAdmin, requestIpAndAgent } from "@/lib/auth";
import { prisma } from "@/lib/db";

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

    return ok({ withdrawal });
  });
}
