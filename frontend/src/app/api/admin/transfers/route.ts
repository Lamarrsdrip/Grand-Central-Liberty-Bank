import { handleApi, ok } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  return handleApi(async () => {
    await requireAdmin();
    const transfers = await prisma.transferRequest.findMany({
      orderBy: { createdAt: "desc" },
      include: { user: true, fromAccount: true }
    });

    return ok({ transfers });
  });
}
