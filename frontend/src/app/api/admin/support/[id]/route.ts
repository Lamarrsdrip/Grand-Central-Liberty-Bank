import { NextRequest } from "next/server";
import { z } from "zod";
import { handleApi, ok } from "@/lib/api";
import { auditLog, notifyUser } from "@/lib/audit";
import { requireAdmin, requestIpAndAgent } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendTransactionalEmail } from "@/lib/transactional-email";
import { safeUserSelect } from "@/lib/user-select";

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
      },
      include: { user: { select: safeUserSelect } }
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
    if (input.status) {
      await sendTransactionalEmail({
        event: "SUPPORT_TICKET_STATUS", to: ticket.user.email, idempotencyKey: `support-ticket-status:${id}:${input.status}`,
        relatedUserId: ticket.userId, relatedEntityType: "SupportTicket", relatedEntityId: id,
        data: { customerName: `${ticket.user.firstName} ${ticket.user.lastName}`, status: ticket.status, transactionReference: id.slice(-8).toUpperCase(), timestamp: ticket.updatedAt, nextStep: ticket.status === "CLOSED" ? "Reopen the conversation by sending a new message if you need more help." : "Sign in to view your secure support conversation." }
      });
    }

    return ok({ ticket });
  });
}
