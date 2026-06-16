import { NextRequest } from "next/server";
import { z } from "zod";
import { handleApi, ok } from "@/lib/api";
import { auditLog, notifyUser } from "@/lib/audit";
import { requireAdmin, requestIpAndAgent } from "@/lib/auth";
import { prisma } from "@/lib/db";

const schema = z.object({
  status: z.enum(["OPEN", "ACTIVE", "CLOSED"]).optional(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional(),
  assignToMe: z.boolean().optional()
});

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const admin = await requireAdmin();
    const { id } = await context.params;
    const input = schema.parse(await request.json());
    const { ip, userAgent } = await requestIpAndAgent();
    const ticket = await prisma.supportTicket.update({
      where: { id },
      data: {
        status: input.status,
        priority: input.priority,
        assignedAdminId: input.assignToMe ? admin.id : undefined
      }
    });
    await notifyUser(ticket.userId, {
      type: "NEW_MESSAGE",
      title: "Support ticket updated",
      body: `Your support ticket is now ${ticket.status.toLowerCase()}.`
    });
    await auditLog({
      actorId: admin.id,
      action: "ADMIN_UPDATED_SUPPORT_TICKET",
      entity: "SupportTicket",
      entityId: id,
      metadata: input,
      ip,
      userAgent
    });

    return ok({ ticket });
  });
}
