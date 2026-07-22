import { randomBytes } from "node:crypto";
import { NextRequest } from "next/server";
import { z } from "zod";
import { created, handleApi, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { beneficiarySchema } from "@/lib/validators";
import { sendTransactionalEmail } from "@/lib/transactional-email";

export async function GET() {
  return handleApi(async () => {
    const user = await requireUser();
    const beneficiaries = await prisma.savedBeneficiary.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" }
    });
    return ok({ beneficiaries });
  });
}

export async function POST(request: NextRequest) {
  return handleApi(async () => {
    const user = await requireUser();
    const input = beneficiarySchema.parse(await request.json());

    const id = randomBytes(12).toString("hex");
    const now = new Date().toISOString();
    await prisma.$runCommandRaw({
      insert: "SavedBeneficiary",
      documents: [{
        _id: { $oid: id },
        userId: { $oid: user.id },
        nickname: input.nickname || null,
        recipientName: input.recipientName,
        bankName: input.bankName,
        accountNumber: input.accountNumber,
        routingSwift: input.routingSwift || null,
        recipientCountry: input.recipientCountry,
        currency: input.currency,
        createdAt: { $date: now },
        updatedAt: { $date: now }
      }],
      writeConcern: { w: 1 }
    });
    await sendTransactionalEmail({
      event: "BENEFICIARY_ADDED", to: user.email, idempotencyKey: `beneficiary-added:${id}`,
      relatedUserId: user.id, relatedEntityType: "SavedBeneficiary", relatedEntityId: id,
      data: { customerName: `${user.firstName} ${user.lastName}`, maskedAccount: `•••• ${input.accountNumber.slice(-4)}`, timestamp: new Date(now), nextStep: "Contact support immediately if you did not add this beneficiary." }
    });

    return created({ id });
  });
}

export async function DELETE(request: NextRequest) {
  return handleApi(async () => {
    const user = await requireUser();
    const { id } = z.object({ id: z.string().min(1) }).parse(await request.json());
    const beneficiary = await prisma.savedBeneficiary.findFirst({ where: { id, userId: user.id }, select: { accountNumber: true } });
    if (!beneficiary) throw new Response("Beneficiary was not found.", { status: 404 });
    await prisma.$runCommandRaw({
      delete: "SavedBeneficiary",
      deletes: [{ q: { _id: { $oid: id }, userId: { $oid: user.id } }, limit: 1 }],
      writeConcern: { w: 1 }
    });
    await sendTransactionalEmail({
      event: "BENEFICIARY_REMOVED", to: user.email, idempotencyKey: `beneficiary-removed:${id}`,
      relatedUserId: user.id, relatedEntityType: "SavedBeneficiary", relatedEntityId: id,
      data: { customerName: `${user.firstName} ${user.lastName}`, maskedAccount: `•••• ${beneficiary.accountNumber.slice(-4)}`, timestamp: new Date(), nextStep: "Contact support immediately if you did not remove this beneficiary." }
    });
    return ok({ ok: true });
  });
}
