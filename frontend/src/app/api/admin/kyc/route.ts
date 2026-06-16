import { handleApi, ok } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  return handleApi(async () => {
    await requireAdmin();
    const submissions = await prisma.kycSubmission.findMany({
      orderBy: { createdAt: "desc" },
      include: { user: true, reviewedBy: true, notesHistory: { orderBy: { createdAt: "desc" } } }
    });

    return ok({ submissions });
  });
}
