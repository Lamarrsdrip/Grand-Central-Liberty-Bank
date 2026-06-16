import { NextRequest } from "next/server";
import { handleApi, ok } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  return handleApi(async () => {
    await requireAdmin();
    const query = request.nextUrl.searchParams.get("q")?.trim();
    const users = await prisma.user.findMany({
      where: query
        ? {
            OR: [
              { email: { contains: query, mode: "insensitive" } },
              { firstName: { contains: query, mode: "insensitive" } },
              { lastName: { contains: query, mode: "insensitive" } },
              { phone: { contains: query, mode: "insensitive" } }
            ]
          }
        : undefined,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        accounts: true,
        kycSubmissions: { orderBy: { createdAt: "desc" }, take: 1 },
        supportTickets: { orderBy: { updatedAt: "desc" }, take: 3 },
        loginHistory: { orderBy: { createdAt: "desc" }, take: 5 }
      }
    });

    return ok({ users });
  });
}
