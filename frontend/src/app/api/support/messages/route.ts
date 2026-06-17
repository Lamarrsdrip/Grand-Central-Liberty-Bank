import { NextRequest } from "next/server";
import { created, handleApi, ok } from "@/lib/api";
import { auditLog, notifyUser } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { plainText } from "@/lib/sanitize";
import { messageSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  return handleApi(async () => {
    const user = await requireUser();
    const ticketId = request.nextUrl.searchParams.get("ticketId");
    if (!ticketId) {
      throw new Response("ticketId is required.", { status: 400 });
    }
    const ticket = await prisma.supportTicket.findFirst({
      where: user.role === "ADMIN" ? { id: ticketId } : { id: ticketId, userId: user.id },
      include: { messages: { orderBy: { createdAt: "asc" }, include: { sender: true } } }
    });
    if (!ticket) {
      throw new Response("Support ticket was not found.", { status: 404 });
    }

    return ok({ messages: ticket.messages });
  });
}

export async function POST(request: NextRequest) {
  return handleApi(async () => {
    const user = await requireUser();
    const input = messageSchema.parse(await request.json());
    const ticket = await prisma.supportTicket.findFirst({
      where: user.role === "ADMIN" ? { id: input.ticketId } : { id: input.ticketId, userId: user.id },
      include: { user: true }
    });
    if (!ticket) {
      throw new Response("Support ticket was not found.", { status: 404 });
    }

    const message = await prisma.supportMessage.create({
      data: {
        ticketId: input.ticketId,
        senderId: user.id,
        body: plainText(input.body),
        attachmentUrl: input.attachmentUrl
      }
    });
    await prisma.supportTicket.update({
      where: { id: ticket.id },
      data: { status: user.role === "ADMIN" ? "ACTIVE" : ticket.status, updatedAt: new Date() }
    });

    const recipientId = user.id === ticket.userId ? ticket.assignedAdminId : ticket.userId;
    if (recipientId) {
      await notifyUser(recipientId, {
        type: "NEW_MESSAGE",
        title: "New support message",
        body: `${user.firstName} sent a new support message.`
      });
    }
    await auditLog({ actorId: user.id, action: "SUPPORT_MESSAGE_SENT", entity: "SupportTicket", entityId: ticket.id });

    return created({ message });
  });
}
