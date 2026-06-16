import { handleApi, ok } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  return handleApi(async () => {
    await requireAdmin();
    const applications = await prisma.cardApplication.findMany({
      orderBy: { createdAt: "desc" },
      include: { user: true, reviewedBy: true }
    });

    return ok({ applications });
  });
}
