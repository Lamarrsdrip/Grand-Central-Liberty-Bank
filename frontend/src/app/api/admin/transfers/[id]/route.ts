import { NextRequest } from "next/server";
import { z } from "zod";
import { handleApi, ok } from "@/lib/api";
import { auditLog, notifyUser } from "@/lib/audit";
import { requireAdmin, requestIpAndAgent } from "@/lib/auth";
import { prisma } from "@/lib/db";

const schema = z.object({
  status: z.enum(["UNDER_REVIEW", "APPROVED", "REJECTED", "CANCELLED"]),
  adminNote: z.string().min(3)
});

// Statuses that are final — once set, the transfer cannot be re-reviewed.
const TERMINAL_STATUSES = new Set(["APPROVED", "REJECTED", "CANCELLED"]);

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const admin = await requireAdmin();
    const { id } = await context.params;
    const input = schema.parse(await request.json());
    const { ip, userAgent } = await requestIpAndAgent();

    // MongoDB doesn't support per-transaction isolation levels the way Postgres
    // does, so we guard double-approval with an atomic conditional update on
    // the transfer status *before* moving money. The conditional update is
    // atomic at the document level and acts as the gate. The money move and
    // the ledger insert then run inside an interactive transaction so a
    // mid-flight crash can't leave a half-applied debit.
    //
    // Funds re-check at approval time stays the same as before.
    const existing = await prisma.transferRequest.findUnique({
      where: { id },
      include: { fromAccount: true }
    });
    if (!existing) {
      throw new Response("Transfer request not found.", { status: 404 });
    }
    if (TERMINAL_STATUSES.has(existing.status)) {
      throw new Response(
        `Transfer is already ${existing.status.toLowerCase()} and cannot be modified.`,
        { status: 409 }
      );
    }

    if (input.status === "APPROVED") {
      const account = existing.fromAccount;
      if (!account || account.status !== "ACTIVE") {
        throw new Response("Source account is not active; cannot approve.", { status: 400 });
      }
      const amount = Number(existing.amount);
      const available = Number(account.availableBalance);
      const balance = Number(account.balance);
      if (amount > available) {
        throw new Response("Insufficient available balance to approve this transfer.", { status: 400 });
      }

      // Atomic "claim" of the transfer — only succeeds if it is still in a
      // non-terminal state. Anything else (e.g. another admin already
      // approved) makes this `updateMany` modify 0 documents and we abort.
      const claim = await prisma.transferRequest.updateMany({
        where: {
          id,
          status: { notIn: ["APPROVED", "REJECTED", "CANCELLED"] }
        },
        data: { status: "UNDER_REVIEW" }
      });
      if (claim.count === 0) {
        throw new Response("Transfer was already finalized by another reviewer.", { status: 409 });
      }

      // Now the money side, atomically with the final status flip.
      await prisma.$transaction([
        prisma.account.update({
          where: { id: account.id },
          data: {
            availableBalance: available - amount,
            balance: balance - amount
          }
        }),
        prisma.transaction.create({
          data: {
            accountId: account.id,
            type: "TRANSFER_DEBIT",
            amount: -amount,
            currency: existing.currency,
            description: `Transfer to ${existing.beneficiaryName}`,
            reference: `TRF-${existing.id}`,
            status: "POSTED"
          }
        }),
        prisma.transferRequest.update({
          where: { id },
          data: { status: "APPROVED", adminNote: input.adminNote }
        })
      ]);
    } else {
      await prisma.transferRequest.update({
        where: { id },
        data: { status: input.status, adminNote: input.adminNote }
      });
    }

    const transfer = await prisma.transferRequest.findUnique({ where: { id } });

    await notifyUser(existing.userId, {
      type: "SYSTEM",
      title: `Transfer ${input.status.replace("_", " ").toLowerCase()}`,
      body: input.adminNote
    });
    await auditLog({
      actorId: admin.id,
      action: "ADMIN_REVIEWED_TRANSFER",
      entity: "TransferRequest",
      entityId: id,
      metadata: input,
      ip,
      userAgent
    });

    return ok({ transfer });
  });
}
