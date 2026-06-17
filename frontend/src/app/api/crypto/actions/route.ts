import { NextRequest } from "next/server";
import { z } from "zod";
import { created, handleApi, ok } from "@/lib/api";
import { auditLog, notifyUser } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { plainText } from "@/lib/sanitize";

const schema = z.object({
  action: z.enum(["WITHDRAW", "SEND", "SWAP"]),
  asset: z.string().min(2).max(12),
  network: z.string().min(2).max(40),
  amount: z.coerce.number().positive(),
  toAsset: z.string().min(2).max(12).optional(),
  recipientAddress: z.string().min(8).max(160).optional(),
  notes: z.string().max(500).optional()
});

export async function GET() {
  return handleApi(async () => {
    const user = await requireUser();
    const cryptoAccount = await prisma.account.findFirst({
      where: { userId: user.id, type: "CRYPTO" },
      include: { transactions: { orderBy: { createdAt: "desc" }, take: 20 } }
    });
    return ok({ history: cryptoAccount?.transactions ?? [] });
  });
}

export async function POST(request: NextRequest) {
  return handleApi(async () => {
    const user = await requireUser();
    const input = schema.parse(await request.json());
    const cryptoAccount = await prisma.account.findFirst({ where: { userId: user.id, type: "CRYPTO" } });
    if (!cryptoAccount) {
      throw new Response("Crypto wallet account is not available. Contact support to activate wallet services.", { status: 400 });
    }

    if ((input.action === "WITHDRAW" || input.action === "SEND") && !input.recipientAddress) {
      throw new Response("Recipient wallet address is required.", { status: 400 });
    }
    if (input.action === "SWAP" && !input.toAsset) {
      throw new Response("Select the asset you want to receive.", { status: 400 });
    }

    const reference = `CRYPTO-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    const description =
      input.action === "SWAP"
        ? `Swap ${input.asset} to ${input.toAsset}`
        : `${input.action === "SEND" ? "Send" : "Withdraw"} ${input.asset} on ${input.network}`;

    const transaction = await prisma.transaction.create({
      data: {
        accountId: cryptoAccount.id,
        type: `CRYPTO_${input.action}`,
        amount: -Math.abs(input.amount),
        currency: "USD",
        description: plainText(description, 180),
        reference,
        status: "REVIEW"
      }
    });

    await notifyUser(user.id, {
      type: "SYSTEM",
      title: "Crypto request submitted",
      body: "Your crypto request is pending manual banking review."
    });
    await auditLog({
      actorId: user.id,
      action: `CRYPTO_${input.action}_REQUESTED`,
      entity: "Transaction",
      entityId: transaction.id,
      metadata: {
        asset: input.asset,
        toAsset: input.toAsset,
        network: input.network,
        recipientAddress: input.recipientAddress,
        notes: input.notes
      }
    });

    return created({
      transaction,
      message: "Your crypto request has been submitted for review. No funds move until an administrator approves it."
    });
  });
}
