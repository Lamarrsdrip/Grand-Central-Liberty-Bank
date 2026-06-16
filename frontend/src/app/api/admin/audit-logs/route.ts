import { NextRequest } from "next/server";
import { handleApi, ok } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  return handleApi(async () => {
    await requireAdmin();
    const q = request.nextUrl.searchParams.get("q")?.trim();
    const logs = await prisma.auditLog.findMany({
      where: q
        ? {
            OR: [
              { action: { contains: q, mode: "insensitive" } },
              { entity: { contains: q, mode: "insensitive" } },
              { entityId: { contains: q, mode: "insensitive" } }
            ]
          }
        : undefined,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { actor: true }
    });

    return ok({ logs });
  });
}
