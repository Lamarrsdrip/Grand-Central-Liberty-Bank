import { handleApi, ok } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  return handleApi(async () => {
    await requireAdmin();
    const tickets = await prisma.supportTicket.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        user: true,
        assignedAdmin: true,
        messages: { orderBy: { createdAt: "asc" }, include: { sender: true } }
      }
    });

    return ok({ tickets });
  });
}
