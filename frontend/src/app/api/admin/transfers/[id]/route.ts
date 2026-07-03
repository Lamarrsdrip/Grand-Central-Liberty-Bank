import { NextRequest } from "next/server";
import { z } from "zod";
import { handleApi, ok } from "@/lib/api";
import { auditLog, notifyUser } from "@/lib/audit";
import { requireAdmin, requestIpAndAgent } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { computeApprovalDebit } from "@/lib/domain";

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
      const outcome = computeApprovalDebit({
        currentStatus: existing.status,
        amount: Number(existing.amount),
        account: {
          balance: Number(existing.fromAccount.balance),
          availableBalance: Number(existing.fromAccount.availableBalance),
          status: existing.fromAccount.status
        }
      });
      if (!outcome.ok) {
        throw new Response(outcome.reason, { status: 400 });
      }

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

      // Conditional decrement (not an absolute write of a pre-read balance) —
      // this is what actually closes the race: if a second transfer on the
      // same account was approved in between our read and this write, the
      // availableBalance floor here re-checks against the row's current
      // value at write time instead of trusting our stale snapshot.
      const debited = await prisma.account.updateMany({
        where: {
          id: existing.fromAccount.id,
          status: "ACTIVE",
          availableBalance: { gte: outcome.debit }
        },
        data: {
          availableBalance: { decrement: outcome.debit },
          balance: { decrement: outcome.debit }
        }
      });
      if (debited.count === 0) {
        await prisma.transferRequest.update({
          where: { id },
          data: { status: existing.status }
        }).catch(() => undefined);
        throw new Response(
          "Insufficient available balance at approval time — a concurrent approval on this account may have used the funds. Please review and retry.",
          { status: 409 }
        );
      }

      try {
        await prisma.transaction.create({
          data: {
            accountId: existing.fromAccount.id,
            type: "TRANSFER_DEBIT",
            amount: -outcome.debit,
            currency: existing.currency,
            description: `Transfer to ${existing.beneficiaryName}`,
            reference: `TRF-${existing.id}`,
            status: "POSTED"
          }
        });
        await prisma.transferRequest.update({
          where: { id },
          data: { status: "APPROVED", adminNote: input.adminNote }
        });
      } catch (error) {
        await prisma.transferRequest.update({
          where: { id },
          data: {
            status: existing.status,
            adminNote: `Approval failed during ledger update: ${input.adminNote}`
          }
        }).catch(() => undefined);
        await auditLog({
          actorId: admin.id,
          action: "ADMIN_TRANSFER_APPROVAL_FAILED",
          entity: "TransferRequest",
          entityId: id,
          metadata: { reason: error instanceof Error ? error.message : "Unknown ledger failure" },
          ip,
          userAgent
        });
        throw new Response("Transfer approval could not be completed. Please retry or contact technical operations.", { status: 500 });
      }
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
