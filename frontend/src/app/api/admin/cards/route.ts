import { handleApi, ok } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { safeUserSelect } from "@/lib/user-select";

export async function GET() {
  return handleApi(async () => {
    await requireAdmin();
    const applications = await prisma.cardApplication.findMany({
      orderBy: { createdAt: "desc" },
      include: { user: { select: safeUserSelect }, reviewedBy: { select: safeUserSelect } }
    });

    return ok({ applications });
  });
}
