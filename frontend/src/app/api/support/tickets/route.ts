import { NextRequest } from "next/server";
import { createHash } from "node:crypto";
import { created, handleApi, ok } from "@/lib/api";
import { auditLog, notifyUser } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { plainText } from "@/lib/sanitize";
import { ticketSchema } from "@/lib/validators";
import { log } from "@/lib/logger";
import { sendTransactionalEmail } from "@/lib/transactional-email";
import { deterministicChatObjectId } from "@/lib/chat";
import { resolveSupportSender } from "@/lib/chat-message";

function objectIdFor(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 24);
}

export async function GET() {
  return handleApi(async () => {
    const user = await requireUser();
    const tickets = await prisma.supportTicket.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      include: { messages: { orderBy: { createdAt: "asc" } }, assignedAdmin: { select: { id: true, firstName: true, lastName: true } } }
    });

    return ok({ tickets }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
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
      const message = await prisma.supportMessage.upsert({
        where: { id: deterministicChatObjectId(user.id, existingTicket.id, input.clientMessageId) },
        create: {
          id: deterministicChatObjectId(user.id, existingTicket.id, input.clientMessageId),
          ticketId: existingTicket.id,
          senderId: user.id,
          body: plainText(input.body),
          attachmentUrl: input.attachmentUrl
        }, update: {},
        include: {
          sender: { select: { firstName: true, lastName: true, role: true } }
        }
      });
      await prisma.supportTicket.update({
        where: { id: existingTicket.id },
        data: { status: "ACTIVE", updatedAt: new Date() }
      });

      const bank = await prisma.bankSetting.findUnique({ where: { id: 1 }, select: { supportEmail: true } }).catch(() => null);
      const supportEmail = process.env.SUPPORT_EMAIL ?? bank?.supportEmail;
      if (supportEmail) {
        await sendTransactionalEmail({
          event: "SUPPORT_CUSTOMER_MESSAGE",
          to: supportEmail,
          idempotencyKey: `support-customer-message:${message.id}`,
          relatedUserId: user.id,
          relatedEntityType: "SupportTicket",
          relatedEntityId: existingTicket.id,
          data: { customerName: "Support team", explanation: `${user.firstName} ${user.lastName} (${user.email}) sent a support message.`, messagePreview: message.body.slice(0, 240), nextStep: "Open the Admin Command Center to respond.", actionUrl: `${process.env.APP_URL ?? ""}/admin?tab=support` }
        });
      }

      return created({
        ticket: {
          ...existingTicket,
          messages: [{
            id: message.id,
            body: message.body,
            senderId: message.senderId,
            attachmentUrl: message.attachmentUrl,
            createdAt: message.createdAt,
            ...resolveSupportSender(message, user.id)
          }]
        }
      });
    }

    const ticketId = objectIdFor(`${user.id}:ticket:${input.clientMessageId}`);
    const ticket = await prisma.supportTicket.upsert({
      where: { id: ticketId },
      create: {
        id: ticketId,
        userId: user.id,
        subject: plainText(input.subject, 160)
      },
      update: {}
    });
    const message = await prisma.supportMessage.upsert({
      where: { id: deterministicChatObjectId(user.id, ticket.id, input.clientMessageId) },
      create: {
        id: deterministicChatObjectId(user.id, ticket.id, input.clientMessageId),
        ticketId: ticket.id,
        senderId: user.id,
        body: plainText(input.body),
        attachmentUrl: input.attachmentUrl
      }, update: {},
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
    log.info("chat.ticket.created", { actorId: user.id, ticketId: ticket.id, messageId: message.id });

    await sendTransactionalEmail({
      event: "SUPPORT_TICKET_CREATED",
      to: user.email,
      idempotencyKey: `support-ticket-created:${ticket.id}`,
      relatedUserId: user.id,
      relatedEntityType: "SupportTicket",
      relatedEntityId: ticket.id,
      data: { customerName: `${user.firstName} ${user.lastName}`, status: ticket.status, transactionReference: ticket.id.slice(-8).toUpperCase(), nextStep: "A support specialist will reply in your secure conversation.", actionUrl: `${process.env.APP_URL ?? ""}/support` }
    });
    const bank = await prisma.bankSetting.findUnique({ where: { id: 1 }, select: { supportEmail: true } }).catch(() => null);
    const supportEmail = process.env.SUPPORT_EMAIL ?? bank?.supportEmail;
    if (supportEmail) {
      await sendTransactionalEmail({
        event: "SUPPORT_CUSTOMER_MESSAGE",
        to: supportEmail,
        idempotencyKey: `support-customer-message:${message.id}`,
        relatedUserId: user.id,
        relatedEntityType: "SupportTicket",
        relatedEntityId: ticket.id,
        data: { customerName: "Support team", explanation: `${user.firstName} ${user.lastName} (${user.email}) opened a support ticket.`, messagePreview: message.body.slice(0, 240), nextStep: "Open the Admin Command Center to respond.", actionUrl: `${process.env.APP_URL ?? ""}/admin?tab=support` }
      });
    }

    return created({
      ticket: {
        ...ticket,
        messages: [{
          id: message.id,
          body: message.body,
          senderId: message.senderId,
          attachmentUrl: message.attachmentUrl,
          createdAt: message.createdAt,
          ...resolveSupportSender(message, user.id)
        }]
      }
    });
  });
}
