import { NextRequest } from "next/server";
import { created, handleApi, ok } from "@/lib/api";
import { auditLog, notifyUser } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { defaultTransferSettings } from "@/lib/domain";
import { canSubmitTransfer } from "@/lib/domain";
import { transferSchema } from "@/lib/validators";

export async function GET() {
  return handleApi(async () => {
    const user = await requireUser();
    const transfers = await prisma.transferRequest.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: { fromAccount: true }
    });
    const settings = await prisma.transferSetting.findUnique({ where: { id: 1 } });

    return ok({ transfers, settings: settings ?? defaultTransferSettings });
  });
}

export async function POST(request: NextRequest) {
  return handleApi(async () => {
    const user = await requireUser();
    const input = transferSchema.parse(await request.json());
    const account = await prisma.account.findFirst({
      where: { id: input.fromAccountId, userId: user.id, status: "ACTIVE" }
    });
    if (!account) {
      throw new Response("The selected source account is not available for transfer.", { status: 400 });
    }

    // Validate funds and currency before creating the transfer request.
    const eligibility = canSubmitTransfer({
      amount: input.amount,
      currency: input.currency,
      account: {
        availableBalance: Number(account.availableBalance),
        currency: account.currency,
        status: account.status
      }
    });
    if (!eligibility.ok) {
      throw new Response(eligibility.reason, { status: 400 });
    }

    const transfer = await prisma.transferRequest.create({
      data: {
        userId: user.id,
        fromAccountId: input.fromAccountId,
        type: input.type,
        beneficiaryName: input.beneficiaryName,
        beneficiaryBank: input.beneficiaryBank,
        beneficiaryAccount: input.beneficiaryAccount,
        ibanSwift: input.ibanSwift,
        amount: input.amount,
        currency: input.currency,
        purpose: input.purpose,
        status: "SUBMITTED"
      }
    });
    const settings = await prisma.transferSetting.findUnique({ where: { id: 1 } });
    await notifyUser(user.id, {
      type: "TRANSFER_SUBMITTED",
      title: "Transfer submitted",
      body: settings?.reviewMessage ?? defaultTransferSettings.reviewMessage
    });
    await auditLog({ actorId: user.id, action: "TRANSFER_SUBMITTED", entity: "TransferRequest", entityId: transfer.id });

    return created({ transfer, message: settings ?? defaultTransferSettings });
  });
}
