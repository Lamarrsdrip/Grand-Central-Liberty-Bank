import { createHash, randomBytes } from "node:crypto";
import { NextRequest } from "next/server";
import { created, handleApi, ok } from "@/lib/api";
import { auditLog, notifyUser } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { defaultTransferSettings } from "@/lib/domain";
import { canSubmitTransfer } from "@/lib/domain";
import { formatTransferReference } from "@/lib/domain";
import { transferSchema } from "@/lib/validators";
import { sendTransactionalEmail } from "@/lib/transactional-email";

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
    const transferId = createHash("sha256").update(`${user.id}:${input.clientRequestId}`).digest("hex").slice(0, 24);
    const prior = await prisma.transferRequest.findUnique({
      where: { id: transferId }
    });
    if (prior) {
      const policy = (await prisma.transferSetting.findUnique({ where: { id: 1 } })) ?? defaultTransferSettings;
      return ok({ transfer: prior, duplicate: true, message: { ...policy, reference: formatTransferReference(policy.referencePrefix, prior.id), status: prior.status } });
    }
    const account = await prisma.account.findFirst({
      where: { id: input.fromAccountId, userId: user.id, status: "ACTIVE" }
    });
    const settings = await prisma.transferSetting.findUnique({ where: { id: 1 } });
    const policy = settings ?? defaultTransferSettings;
    if (!account) {
      throw new Response(policy.blockedMessage, { status: 400 });
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
      throw new Response(`${policy.blockedMessage} ${eligibility.reason}`, { status: 400 });
    }

    const transfer = await prisma.transferRequest.create({
      data: {
        id: transferId,
        userId: user.id,
        fromAccountId: input.fromAccountId,
        type: input.type,
        beneficiaryName: input.beneficiaryName,
        beneficiaryBank: input.beneficiaryBank,
        beneficiaryAccount: input.beneficiaryAccount,
        ibanSwift: input.ibanSwift,
        recipientCountry: input.recipientCountry,
        amount: input.amount,
        currency: input.currency,
        purpose: input.purpose,
        status: "SUBMITTED"
      }
    });

    if (input.saveBeneficiary) {
      const benefId = randomBytes(12).toString("hex");
      const now = new Date().toISOString();
      await prisma.$runCommandRaw({
        insert: "SavedBeneficiary",
        documents: [{
          _id: { $oid: benefId },
          userId: { $oid: user.id },
          nickname: input.beneficiaryNickname || null,
          recipientName: input.beneficiaryName,
          bankName: input.beneficiaryBank ?? "",
          accountNumber: input.beneficiaryAccount ?? "",
          routingSwift: input.ibanSwift || null,
          recipientCountry: input.recipientCountry,
          currency: input.currency,
          createdAt: { $date: now },
          updatedAt: { $date: now }
        }],
        writeConcern: { w: 1 }
      });
    }

    await notifyUser(user.id, {
      type: "TRANSFER_SUBMITTED",
      title: "Transfer submitted",
      body: policy.reviewMessage
    });
    await auditLog({ actorId: user.id, action: "TRANSFER_SUBMITTED", entity: "TransferRequest", entityId: transfer.id });
    await sendTransactionalEmail({
      event: "BANK_TRANSFER_CREATED",
      to: user.email,
      idempotencyKey: `transfer-created:${transfer.id}`,
      relatedUserId: user.id,
      relatedEntityType: "TransferRequest",
      relatedEntityId: transfer.id,
      data: {
        customerName: `${user.firstName} ${user.lastName}`,
        transactionType: transfer.type,
        amount: transfer.amount,
        currency: transfer.currency,
        status: transfer.status,
        maskedAccount: `•••• ${account.accountNumber.slice(-4)}`,
        transactionReference: formatTransferReference(policy.referencePrefix, transfer.id),
        timestamp: transfer.createdAt,
        nextStep: policy.reviewMessage
      }
    });

    return created({
      transfer,
      message: {
        ...policy,
        reference: formatTransferReference(policy.referencePrefix, transfer.id),
        status: "UNDER_REVIEW"
      }
    });
  });
}
