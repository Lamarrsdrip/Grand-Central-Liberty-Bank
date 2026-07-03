import { NextRequest } from "next/server";
import { created, handleApi, ok } from "@/lib/api";
import { auditLog, notifyUser } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { plainText } from "@/lib/sanitize";
import { ticketSchema } from "@/lib/validators";

export async function GET() {
  return handleApi(async () => {
    const user = await requireUser();
    const tickets = await prisma.supportTicket.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      include: { messages: { orderBy: { createdAt: "asc" } }, assignedAdmin: true }
    });

    return ok({ tickets });
  });
}

export async function POST(request: NextRequest) {
  return handleApi(async () => {
    const user = await requireUser();
    const input = ticketSchema.parse(await request.json());

    // Two tabs (or a slow retry) both hitting "first message" at once would
    // otherwise each create their own ticket. Reuse an existing OPEN/ACTIVE
    // ticket if one already exists instead of forking the conversation.
    const existingTicket = await prisma.supportTicket.findFirst({
      where: { userId: user.id, status: { in: ["OPEN", "ACTIVE"] } },
      orderBy: { updatedAt: "desc" }
    });

    if (existingTicket) {
      const message = await prisma.supportMessage.create({
        data: {
          ticketId: existingTicket.id,
          senderId: user.id,
          body: plainText(input.body),
          attachmentUrl: input.attachmentUrl
        },
        include: {
          sender: { select: { firstName: true, lastName: true, role: true } }
        }
      });
      await prisma.supportTicket.update({
        where: { id: existingTicket.id },
        data: { status: "ACTIVE", updatedAt: new Date() }
      });

      return created({
        ticket: {
          ...existingTicket,
          messages: [{
            id: message.id,
            body: message.body,
            senderId: message.senderId,
            attachmentUrl: message.attachmentUrl,
            createdAt: message.createdAt,
            senderName: `${message.sender.firstName} ${message.sender.lastName}`,
            senderRole: message.sender.role
          }]
        }
      });
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        userId: user.id,
        subject: plainText(input.subject, 160)
      }
    });
    const message = await prisma.supportMessage.create({
      data: {
        ticketId: ticket.id,
        senderId: user.id,
        body: plainText(input.body),
        attachmentUrl: input.attachmentUrl
      },
      include: {
        sender: { select: { firstName: true, lastName: true, role: true } }
      }
    });
    await notifyUser(user.id, {
      type: "NEW_MESSAGE",
      title: "Support ticket opened",
      body: "A support specialist can now respond to your request."
    });
    await auditLog({ actorId: user.id, action: "SUPPORT_TICKET_OPENED", entity: "SupportTicket", entityId: ticket.id });

    return created({
      ticket: {
        ...ticket,
        messages: [{
          id: message.id,
          body: message.body,
          senderId: message.senderId,
          attachmentUrl: message.attachmentUrl,
          createdAt: message.createdAt,
          senderName: `${message.sender.firstName} ${message.sender.lastName}`,
          senderRole: message.sender.role
        }]
      }
    });
  });
}
