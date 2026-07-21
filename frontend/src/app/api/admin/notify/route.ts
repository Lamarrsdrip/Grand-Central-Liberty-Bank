import { NextRequest } from "next/server";
import { z } from "zod";
import { handleApi, ok } from "@/lib/api";
import { auditLog, notifyUser } from "@/lib/audit";
import { requireAdmin, requestIpAndAgent } from "@/lib/auth";
import { prisma } from "@/lib/db";

const schema = z.object({
  target: z.enum(["USER", "ALL"]),
  userId: z.string().optional(),
  type: z.enum(["SYSTEM", "KYC_APPROVED", "KYC_REJECTED", "TRANSFER_SUBMITTED", "ACCOUNT_FROZEN", "ACCOUNT_UNFROZEN", "LOGIN_ALERT", "EMAIL_VERIFICATION"]).default("SYSTEM"),
  title: z.string().min(2),
  body: z.string().min(2)
});

export async function POST(request: NextRequest) {
  return handleApi(async () => {
    const admin = await requireAdmin();
    const input = schema.parse(await request.json());
    const { ip, userAgent } = await requestIpAndAgent();

    if (input.target === "USER") {
      if (!input.userId) throw new Response("userId required for USER target", { status: 400 });
      await notifyUser(input.userId, { type: input.type, title: input.title, body: input.body });
      await auditLog({ actorId: admin.id, action: "ADMIN_SENT_NOTIFICATION", entity: "User", entityId: input.userId, metadata: { title: input.title }, ip, userAgent });
      return ok({ sent: 1 });
    }

    // ALL users
    const users = await prisma.user.findMany({ where: { role: "USER" }, select: { id: true } });
    await Promise.allSettled(users.map((u) => notifyUser(u.id, { type: input.type, title: input.title, body: input.body })));
    await auditLog({ actorId: admin.id, action: "ADMIN_BROADCAST_NOTIFICATION", entity: "User", metadata: { title: input.title, count: users.length }, ip, userAgent });
    return ok({ sent: users.length });
  });
}
