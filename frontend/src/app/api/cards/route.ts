import { NextRequest } from "next/server";
import { created, handleApi, ok } from "@/lib/api";
import { auditLog, notifyUser } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { cardApplicationSchema } from "@/lib/validators";
import { sendTransactionalEmail } from "@/lib/transactional-email";

export async function GET() {
  return handleApi(async () => {
    const user = await requireUser();
    const applications = await prisma.cardApplication.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" }
    });

    return ok({ applications });
  });
}

export async function POST(request: NextRequest) {
  return handleApi(async () => {
    const user = await requireUser();
    const input = cardApplicationSchema.parse(await request.json());
    const application = await prisma.cardApplication.create({
      data: {
        userId: user.id,
        type: input.type,
        occupation: input.occupation,
        annualIncome: input.annualIncome,
        employer: input.employer,
        address: input.address,
        governmentIdUrl: input.governmentIdUrl
      }
    });
    await notifyUser(user.id, {
      type: "SYSTEM",
      title: "Card application submitted",
      body: "Your card application is now awaiting manual admin review."
    });
    await auditLog({ actorId: user.id, action: "CARD_APPLICATION_SUBMITTED", entity: "CardApplication", entityId: application.id });
    await sendTransactionalEmail({
      event: "CARD_REQUESTED", to: user.email, idempotencyKey: `card-requested:${application.id}`,
      relatedUserId: user.id, relatedEntityType: "CardApplication", relatedEntityId: application.id,
      data: { customerName: `${user.firstName} ${user.lastName}`, status: application.status, transactionType: `${application.type} card`, timestamp: application.createdAt, nextStep: "Your application is awaiting manual review." }
    });

    return created({ application });
  });
}
