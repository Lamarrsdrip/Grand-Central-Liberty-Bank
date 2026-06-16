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
    const ticket = await prisma.supportTicket.create({
      data: {
        userId: user.id,
        subject: plainText(input.subject, 160),
        messages: {
          create: {
            senderId: user.id,
            body: plainText(input.body),
            attachmentUrl: input.attachmentUrl
          }
        }
      },
      include: { messages: true }
    });
    await notifyUser(user.id, {
      type: "NEW_MESSAGE",
      title: "Support ticket opened",
      body: "A support specialist can now respond to your request."
    });
    await auditLog({ actorId: user.id, action: "SUPPORT_TICKET_OPENED", entity: "SupportTicket", entityId: ticket.id });

    return created({ ticket });
  });
}
