import { NextRequest } from "next/server";
import { created, handleApi, ok } from "@/lib/api";
import { auditLog, notifyUser } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { kycSchema } from "@/lib/validators";
import { sendTransactionalEmail } from "@/lib/transactional-email";

export async function GET() {
  return handleApi(async () => {
    const user = await requireUser();
    const submissions = await prisma.kycSubmission.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: { notesHistory: { orderBy: { createdAt: "desc" }, where: { visibleToUser: true } } }
    });

    return ok({ submissions });
  });
}

export async function POST(request: NextRequest) {
  return handleApi(async () => {
    const user = await requireUser();
    const input = kycSchema.parse(await request.json());
    const submission = await prisma.kycSubmission.create({
      data: {
        userId: user.id,
        documentType: input.documentType,
        documentUrl: input.documentUrl,
        selfieUrl: input.selfieUrl,
        status: "PENDING"
      }
    });
    try {
      await prisma.kycNote.create({
        data: {
          kycSubmissionId: submission.id,
          body: "Documents received and queued for manual verification.",
          visibleToUser: true
        }
      });
    } catch (error) {
      console.error("[kyc] note create failed:", error);
    }
    await notifyUser(user.id, {
      type: "SYSTEM",
      title: "KYC submitted",
      body: "Your verification documents were received and are pending manual review."
    });
    await auditLog({ actorId: user.id, action: "KYC_SUBMITTED", entity: "KycSubmission", entityId: submission.id });
    await sendTransactionalEmail({
      event: "KYC_SUBMITTED", to: user.email, idempotencyKey: `kyc-submitted:${submission.id}`,
      relatedUserId: user.id, relatedEntityType: "KycSubmission", relatedEntityId: submission.id,
      data: { customerName: `${user.firstName} ${user.lastName}`, status: submission.status, timestamp: submission.createdAt, nextStep: "Your documents are queued for manual verification. We will notify you when the review changes." }
    });

    return created({ submission });
  });
}
