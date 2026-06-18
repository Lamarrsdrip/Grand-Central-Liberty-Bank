import { randomBytes } from "node:crypto";
import { NextRequest } from "next/server";
import { created, handleApi, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { beneficiarySchema } from "@/lib/validators";

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

    return created({ id });
  });
}

export async function DELETE(request: NextRequest) {
  return handleApi(async () => {
    const user = await requireUser();
    const { id } = await request.json();
    await prisma.$runCommandRaw({
      delete: "SavedBeneficiary",
      deletes: [{ q: { _id: { $oid: id }, userId: { $oid: user.id } }, limit: 1 }],
      writeConcern: { w: 1 }
    });
    return ok({ ok: true });
  });
}
