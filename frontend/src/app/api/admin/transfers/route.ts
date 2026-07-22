import { handleApi, ok } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { safeUserSelect } from "@/lib/user-select";

export async function GET() {
  return handleApi(async () => {
    await requireAdmin();
    const transfers = await prisma.transferRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { user: { select: safeUserSelect }, fromAccount: true }
    });

    return ok({ transfers });
  });
}
