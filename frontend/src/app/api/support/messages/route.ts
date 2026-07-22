import { NextRequest } from "next/server";
import { created, handleApi, ok } from "@/lib/api";
import { auditLog, notifyUser } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { plainText } from "@/lib/sanitize";
import { messageSchema } from "@/lib/validators";
import { log } from "@/lib/logger";
import { sendTransactionalEmail } from "@/lib/transactional-email";
import { deterministicChatObjectId, parseIncrementalChatDate } from "@/lib/chat";

function publicMessage(message: {
  id: string;
  body: string;
  senderId: string;
  attachmentUrl: string | null;
  createdAt: Date;
  readAt: Date | null;
  sender: { firstName: string; lastName: string; role: string };
}) {
  return {
    id: message.id,
    body: message.body,
    senderId: message.senderId,
    attachmentUrl: message.attachmentUrl,
    createdAt: message.createdAt,
    readAt: message.readAt,
    senderName: `${message.sender.firstName} ${message.sender.lastName}`,
    senderRole: message.sender.role
  };
}

export async function GET(request: NextRequest) {
  return handleApi(async () => {
    const user = await requireUser();
    const ticketId = request.nextUrl.searchParams.get("ticketId");
    const afterRaw = request.nextUrl.searchParams.get("after");
    if (!ticketId) {
      throw new Response("ticketId is required.", { status: 400 });
    }
    const after = parseIncrementalChatDate(afterRaw);
    const ticket = await prisma.supportTicket.findFirst({
      where: user.role === "ADMIN" ? { id: ticketId } : { id: ticketId, userId: user.id },
      include: {
        messages: {
          where: after ? { createdAt: { gt: after } } : undefined,
          orderBy: { createdAt: "asc" },
          include: { sender: { select: { firstName: true, lastName: true, role: true } } }
        }
      }
    });
    if (!ticket) {
      throw new Response("Support ticket was not found.", { status: 404 });
    }

    log.info("chat.messages.retrieved", {
      actorId: user.id,
      actorRole: user.role,
      ticketId,
      count: ticket.messages.length,
      incremental: Boolean(afterRaw)
    });
    return ok(
      { messages: ticket.messages.map(publicMessage) },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } }
    );
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

    const messageId = deterministicChatObjectId(user.id, input.ticketId, input.clientMessageId);
    const message = await prisma.supportMessage.upsert({
      where: { id: messageId },
      create: {
        id: messageId,
        ticketId: input.ticketId,
        senderId: user.id,
        body: plainText(input.body),
        attachmentUrl: input.attachmentUrl
      },
      update: {},
      include: {
        sender: { select: { firstName: true, lastName: true, role: true } }
      }
    });
    // Any reply — admin or user — brings the ticket back to ACTIVE. Without this,
    // a user replying into a CLOSED ticket left it CLOSED forever: the message
    // was saved but nothing signaled it needed attention again.
    await prisma.supportTicket.update({
      where: { id: ticket.id },
      data: { status: "ACTIVE", updatedAt: new Date() }
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

    log.info("chat.message.persisted", {
      actorId: user.id,
      actorRole: user.role,
      ticketId: ticket.id,
      messageId: message.id,
      recipientId
    });

    if (user.role === "ADMIN") {
      await sendTransactionalEmail({
        event: "SUPPORT_ADMIN_REPLY",
        to: ticket.user.email,
        idempotencyKey: `support-admin-reply:${message.id}`,
        relatedUserId: ticket.userId,
        relatedEntityType: "SupportTicket",
        relatedEntityId: ticket.id,
        data: {
          customerName: `${ticket.user.firstName} ${ticket.user.lastName}`,
          messagePreview: message.body.slice(0, 240),
          nextStep: "Sign in to your secure support conversation to read and reply.",
          actionUrl: `${process.env.APP_URL ?? ""}/support`
        }
      });
    } else {
      const bank = await prisma.bankSetting.findUnique({ where: { id: 1 }, select: { supportEmail: true } }).catch(() => null);
      const supportEmail = process.env.SUPPORT_EMAIL ?? bank?.supportEmail;
      if (supportEmail) {
        await sendTransactionalEmail({
          event: "SUPPORT_CUSTOMER_MESSAGE",
          to: supportEmail,
          idempotencyKey: `support-customer-message:${message.id}`,
          relatedUserId: ticket.userId,
          relatedEntityType: "SupportTicket",
          relatedEntityId: ticket.id,
          data: {
            customerName: "Support team",
            explanation: `${ticket.user.firstName} ${ticket.user.lastName} (${ticket.user.email}) sent a support message.`,
            messagePreview: message.body.slice(0, 240),
            nextStep: "Open the Admin Command Center to respond.",
            actionUrl: `${process.env.APP_URL ?? ""}/admin?tab=support`
          }
        });
      }
    }

    return created({ message: publicMessage(message) });
  });
}

export async function PATCH(request: NextRequest) {
  return handleApi(async () => {
    const user = await requireUser();
    const { ticketId } = messageSchema.pick({ ticketId: true }).parse(await request.json());
    const ticket = await prisma.supportTicket.findFirst({
      where: user.role === "ADMIN" ? { id: ticketId } : { id: ticketId, userId: user.id }
    });
    if (!ticket) throw new Response("Support ticket was not found.", { status: 404 });

    const result = await prisma.supportMessage.updateMany({
      where: {
        ticketId,
        senderId: { not: user.id },
        OR: [{ readAt: null }, { readAt: { isSet: false } }]
      },
      data: { readAt: new Date() }
    });
    log.info("chat.messages.read", { actorId: user.id, actorRole: user.role, ticketId, count: result.count });
    return ok({ updated: result.count });
  });
}
