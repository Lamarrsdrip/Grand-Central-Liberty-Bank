import { NextRequest } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
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

    // Everything that mutates money happens inside a single serializable transaction
    // so an approval can never run twice or debit a stale balance.
    const transfer = await prisma.$transaction(
      async (tx) => {
        const existing = await tx.transferRequest.findUnique({
          where: { id },
          include: { fromAccount: true }
        });
        if (!existing) {
          throw new Response("Transfer request not found.", { status: 404 });
        }

        // Guard: prevent double-processing of an already-finalized transfer.
        if (TERMINAL_STATUSES.has(existing.status)) {
          throw new Response(
            `Transfer is already ${existing.status.toLowerCase()} and cannot be modified.`,
            { status: 409 }
          );
        }

        // Only an APPROVAL moves money. Other transitions just update status.
        if (input.status === "APPROVED") {
          const account = existing.fromAccount;
          if (!account || account.status !== "ACTIVE") {
            throw new Response("Source account is not active; cannot approve.", { status: 400 });
          }

          const amount = new Prisma.Decimal(existing.amount);
          const available = new Prisma.Decimal(account.availableBalance);
          const balance = new Prisma.Decimal(account.balance);

          // Re-check funds at approval time (balance may have changed since submission).
          if (amount.greaterThan(available)) {
            throw new Response("Insufficient available balance to approve this transfer.", { status: 400 });
          }

          // Debit both balances atomically.
          await tx.account.update({
            where: { id: account.id },
            data: {
              availableBalance: available.minus(amount),
              balance: balance.minus(amount)
            }
          });

          // Create the immutable ledger Transaction record.
          await tx.transaction.create({
            data: {
              accountId: account.id,
              type: "TRANSFER_DEBIT",
              amount: amount.negated(),
              currency: existing.currency,
              description: `Transfer to ${existing.beneficiaryName}`,
              reference: `TRF-${existing.id}`,
              status: "POSTED"
            }
          });
        }

        // Update the transfer status last, inside the same transaction.
        return tx.transferRequest.update({
          where: { id },
          data: { status: input.status, adminNote: input.adminNote }
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    await notifyUser(transfer.userId, {
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
