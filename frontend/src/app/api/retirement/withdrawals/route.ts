import { NextRequest } from "next/server";
import { created, handleApi, ok } from "@/lib/api";
import { auditLog, notifyUser } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  calculateRetirementFee,
  defaultRetirementFeeSettings,
  defaultRetirementWithdrawalMessage
} from "@/lib/domain";
import { retirementWithdrawalSchema } from "@/lib/validators";

export async function GET() {
  return handleApi(async () => {
    const user = await requireUser();
    const requests = await prisma.retirementWithdrawalRequest.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: { retirementAccount: true, notes: { where: { visibleToUser: true }, orderBy: { createdAt: "desc" } } }
    });

    return ok({ requests });
  });
}

export async function POST(request: NextRequest) {
  return handleApi(async () => {
    const user = await requireUser();
    const input = retirementWithdrawalSchema.parse(await request.json());
    const account = await prisma.retirementAccount.findFirst({
      where: { id: input.retirementAccountId, userId: user.id }
    });
    if (!account) {
      throw new Response("401(k) account was not found.", { status: 404 });
    }
    if (account.status === "CLOSED" || account.status === "RESTRICTED") {
      throw new Response("This 401(k) account is not eligible for withdrawal requests.", { status: 400 });
    }
    if (input.amount > Number(account.vestedBalance)) {
      throw new Response("Withdrawal amount exceeds vested balance.", { status: 400 });
    }

    const settings = await prisma.retirementFeeSetting.findUnique({ where: { id: 1 } });
    const feeSettings = settings
      ? {
          feeName: settings.feeName,
          feePercentage: Number(settings.feePercentage),
          feeReason: settings.feeReason,
          paymentMethod: settings.paymentMethod,
          enabled: settings.enabled,
          complianceMessage: settings.complianceMessage
        }
      : defaultRetirementFeeSettings;
    const fee = calculateRetirementFee(input.amount, feeSettings);

    const withdrawal = await prisma.retirementWithdrawalRequest.create({
      data: {
        retirementAccountId: account.id,
        userId: user.id,
        amount: input.amount,
        currency: "USD",
        reason: input.reason,
        status: "SUBMITTED",
        complianceMessage: feeSettings.complianceMessage || defaultRetirementWithdrawalMessage,
        feeName: feeSettings.feeName,
        feePercentage: feeSettings.feePercentage,
        feeAmount: fee.amount,
        feeReason: feeSettings.feeReason,
        paymentMethod: feeSettings.paymentMethod,
        feeEnabled: fee.enabled
      }
    });
    try {
      await prisma.retirementWithdrawalNote.create({
        data: {
          retirementWithdrawalRequestId: withdrawal.id,
          body: "401(k) withdrawal request received for compliance review.",
          visibleToUser: true
        }
      });
    } catch (error) {
      console.error("[retirement] withdrawal note create failed:", error);
    }

    await notifyUser(user.id, {
      type: "SYSTEM",
      title: "401(k) withdrawal submitted",
      body: withdrawal.complianceMessage
    });
    await auditLog({
      actorId: user.id,
      action: "RETIREMENT_WITHDRAWAL_SUBMITTED",
      entity: "RetirementWithdrawalRequest",
      entityId: withdrawal.id,
      metadata: { amount: input.amount, feeAmount: fee.amount, paymentMethod: feeSettings.paymentMethod }
    });

    return created({ withdrawal, message: withdrawal.complianceMessage });
  });
}
