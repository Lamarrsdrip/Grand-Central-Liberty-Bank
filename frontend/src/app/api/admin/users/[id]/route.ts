import { NextRequest } from "next/server";
import { z } from "zod";
import { handleApi, ok } from "@/lib/api";
import { auditLog, notifyUser } from "@/lib/audit";
import { requireAdmin, requestIpAndAgent } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendTransactionalEmail } from "@/lib/transactional-email";
import { safeUserSelect } from "@/lib/user-select";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("FREEZE"), reason: z.string().min(5) }),
  z.object({ action: z.literal("UNFREEZE"), reason: z.string().min(5) }),
  z.object({ action: z.literal("SUSPEND"), reason: z.string().min(5) }),
  z.object({ action: z.literal("ACTIVATE"), reason: z.string().min(5) }),
  z.object({
    action: z.literal("EDIT_PROFILE"),
    firstName: z.string().min(2),
    lastName: z.string().min(2),
    email: z.string().email(),
    phone: z.string().min(7),
    country: z.string().min(2),
    address: z.string().min(5),
    reason: z.string().min(5)
  })
]);

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    await requireAdmin();
    const { id } = await context.params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        ...safeUserSelect,
        accounts: { include: { transactions: { orderBy: { createdAt: "desc" }, take: 20 }, freezeEvents: { orderBy: { createdAt: "desc" } } } },
        kycSubmissions: { orderBy: { createdAt: "desc" }, include: { notesHistory: { orderBy: { createdAt: "desc" } } } },
        cardApplications: { orderBy: { createdAt: "desc" } },
        transferRequests: { orderBy: { createdAt: "desc" } },
        supportTickets: { orderBy: { updatedAt: "desc" }, include: { messages: true } },
        loginHistory: { orderBy: { createdAt: "desc" }, take: 20 }
      }
    });
    if (!user) {
      throw new Response("User was not found.", { status: 404 });
    }

    return ok({ user });
  });
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const admin = await requireAdmin();
    const { id } = await context.params;
    const input = schema.parse(await request.json());
    const { ip, userAgent } = await requestIpAndAgent();
    const target = await prisma.user.findUnique({ where: { id }, select: { email: true, firstName: true, lastName: true } });
    if (!target) throw new Response("User was not found.", { status: 404 });

    if (input.action === "EDIT_PROFILE") {
      await prisma.user.update({
        where: { id },
        data: {
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email,
          phone: input.phone,
          country: input.country,
          address: input.address
        }
      });
    }

    if (input.action === "SUSPEND" || input.action === "ACTIVATE") {
      await prisma.user.update({
        where: { id },
        data: { status: input.action === "SUSPEND" ? "SUSPENDED" : "ACTIVE" }
      });
    }

    if (input.action === "FREEZE" || input.action === "UNFREEZE") {
      const status = input.action === "FREEZE" ? "FROZEN" : "ACTIVE";

      // Mirror the freeze onto User.status too (the schema's UserStatus enum
      // has a FROZEN value for exactly this) so the dashboard's frozen banner
      // — keyed on user.status — actually fires. Guarded so it never
      // overrides a SUSPENDED user back to ACTIVE via an unrelated UNFREEZE.
      const currentUser = await prisma.user.findUnique({ where: { id }, select: { status: true } });
      if (input.action === "FREEZE" && currentUser?.status !== "SUSPENDED") {
        await prisma.user.update({ where: { id }, data: { status: "FROZEN" } });
      } else if (input.action === "UNFREEZE" && currentUser?.status === "FROZEN") {
        await prisma.user.update({ where: { id }, data: { status: "ACTIVE" } });
      }

      const accounts = await prisma.account.findMany({ where: { userId: id } });
      for (const account of accounts) {
        await prisma.account.update({
          where: { id: account.id },
          data: {
            status,
            freezeReason: input.action === "FREEZE" ? input.reason : null,
            frozenAt: input.action === "FREEZE" ? new Date() : null
          }
        });
        try {
          await prisma.accountFreezeEvent.create({
            data: {
              accountId: account.id,
              actorId: admin.id,
              action: status,
              reason: input.reason
            }
          });
        } catch (error) {
          console.error("[admin] accountFreezeEvent.create failed:", error);
        }
      }
    }

    await notifyUser(id, {
      type: "SYSTEM",
      title: input.action === "EDIT_PROFILE" ? "Profile updated by bank operations" : "Account status updated",
      body: input.reason
    });
    await auditLog({
      actorId: admin.id,
      action: `ADMIN_${input.action}_USER`,
      entity: "User",
      entityId: id,
      metadata: { reason: input.reason },
      ip,
      userAgent
    });
    const event = input.action === "SUSPEND" ? "ACCOUNT_SUSPENDED" : input.action === "ACTIVATE" ? "ACCOUNT_ACTIVATED" : input.action === "EDIT_PROFILE" ? "PROFILE_CHANGED" : "ACCOUNT_STATUS_CHANGED";
    await sendTransactionalEmail({
      event, to: input.action === "EDIT_PROFILE" ? input.email : target.email, idempotencyKey: `admin-user-action:${id}:${input.action}:${Date.now()}`,
      relatedUserId: id, relatedEntityType: "User", relatedEntityId: id,
      data: { customerName: input.action === "EDIT_PROFILE" ? `${input.firstName} ${input.lastName}` : `${target.firstName} ${target.lastName}`, status: input.action, explanation: input.reason, timestamp: new Date(), nextStep: "Review your account and contact support immediately if you do not recognize this change." }
    });

    return ok({ success: true });
  });
}
