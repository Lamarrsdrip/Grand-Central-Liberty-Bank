import { NextRequest } from "next/server";
import { z } from "zod";
import { handleApi, ok } from "@/lib/api";
import { auditLog, notifyUser } from "@/lib/audit";
import { requireAdmin, requestIpAndAgent } from "@/lib/auth";
import { prisma } from "@/lib/db";

const schema = z.object({
  status: z.enum(["UNDER_REVIEW", "APPROVED", "REJECTED", "INFO_REQUESTED"]),
  note: z.string().min(3),
  visibleToUser: z.boolean().default(true)
});

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const admin = await requireAdmin();
    const { id } = await context.params;
    const input = schema.parse(await request.json());
    const { ip, userAgent } = await requestIpAndAgent();
    const submission = await prisma.kycSubmission.update({
      where: { id },
      data: {
        status: input.status,
        notes: input.note,
        rejectionReason: input.status === "REJECTED" ? input.note : null,
        reviewedById: admin.id,
        reviewedAt: new Date()
      }
    });
    try {
      await prisma.kycNote.create({
        data: {
          kycSubmissionId: id,
          authorId: admin.id,
          body: input.note,
          visibleToUser: input.visibleToUser
        }
      });
    } catch (error) {
      console.error("[admin] kycNote.create failed:", error);
    }

    const notificationType =
      input.status === "APPROVED" ? "KYC_APPROVED" : input.status === "REJECTED" ? "KYC_REJECTED" : "KYC_INFO_REQUESTED";
    await notifyUser(submission.userId, {
      type: notificationType,
      title: `KYC ${input.status.replace("_", " ").toLowerCase()}`,
      body: input.note
    });
    await auditLog({
      actorId: admin.id,
      action: "ADMIN_REVIEWED_KYC",
      entity: "KycSubmission",
      entityId: id,
      metadata: { status: input.status, note: input.note },
      ip,
      userAgent
    });

    return ok({ submission });
  });
}
