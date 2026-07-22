import { NextRequest } from "next/server";
import { z } from "zod";
import { handleApi, ok } from "@/lib/api";
import { auditLog, notifyUser } from "@/lib/audit";
import { requireAdmin, requestIpAndAgent } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendTransactionalEmail } from "@/lib/transactional-email";

const schema = z.object({
  status: z.enum(["UNDER_REVIEW", "APPROVED", "REJECTED", "INFO_REQUESTED"]),
  adminNote: z.string().min(3)
});

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const admin = await requireAdmin();
    const { id } = await context.params;
    const input = schema.parse(await request.json());
    const { ip, userAgent } = await requestIpAndAgent();
    const application = await prisma.cardApplication.update({
      where: { id },
      data: { status: input.status, adminNote: input.adminNote, reviewedById: admin.id, reviewedAt: new Date() },
      include: { user: true }
    });
    await notifyUser(application.userId, {
      type: input.status === "APPROVED" ? "CARD_APPROVED" : "CARD_REJECTED",
      title: `Card application ${input.status.replace("_", " ").toLowerCase()}`,
      body: input.adminNote
    });
    await auditLog({
      actorId: admin.id,
      action: "ADMIN_REVIEWED_CARD",
      entity: "CardApplication",
      entityId: id,
      metadata: input,
      ip,
      userAgent
    });
    await sendTransactionalEmail({
      event: "CARD_STATUS_CHANGED", to: application.user.email, idempotencyKey: `card-status:${id}:${input.status}`,
      relatedUserId: application.userId, relatedEntityType: "CardApplication", relatedEntityId: id,
      data: { customerName: `${application.user.firstName} ${application.user.lastName}`, status: input.status, transactionType: `${application.type} card`, explanation: input.adminNote, timestamp: new Date(), nextStep: input.status === "INFO_REQUESTED" ? "Sign in and contact support with the requested information." : "Review the status in your card center." }
    });

    return ok({ application });
  });
}
