import { NextRequest } from "next/server";
import { handleApi, ok } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  return handleApi(async () => {
    await requireAdmin();
    const query = request.nextUrl.searchParams.get("q")?.trim();
    const tickets = await prisma.supportTicket.findMany({
      where: query ? {
        OR: [
          { subject: { contains: query, mode: "insensitive" } },
          { user: { is: { firstName: { contains: query, mode: "insensitive" } } } },
          { user: { is: { lastName: { contains: query, mode: "insensitive" } } } },
          { user: { is: { email: { contains: query, mode: "insensitive" } } } }
        ]
      } : undefined,
      orderBy: { updatedAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            accounts: { select: { accountNumber: true }, take: 1 }
          }
        },
        assignedAdmin: { select: { id: true, firstName: true, lastName: true, email: true } },
        messages: {
          orderBy: { createdAt: "asc" },
          include: { sender: { select: { firstName: true, lastName: true, role: true } } }
        }
      }
    });

    return ok({
      tickets: tickets.map((ticket) => ({
        id: ticket.id,
        subject: ticket.subject,
        status: ticket.status,
        priority: ticket.priority,
        updatedAt: ticket.updatedAt,
        unreadCount: ticket.messages.filter((message) => message.sender.role === "USER" && !message.readAt).length,
        user: {
          id: ticket.user.id,
          firstName: ticket.user.firstName,
          lastName: ticket.user.lastName,
          email: ticket.user.email,
          accountReference: ticket.user.accounts[0]?.accountNumber.slice(-4) ?? null
        },
        assignedAdmin: ticket.assignedAdmin,
        messages: ticket.messages.map((message) => ({
          id: message.id,
          body: message.body,
          senderId: message.senderId,
          attachmentUrl: message.attachmentUrl,
          readAt: message.readAt,
          createdAt: message.createdAt,
          senderName: `${message.sender.firstName} ${message.sender.lastName}`,
          senderRole: message.sender.role
        }))
      }))
    }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
  });
}
