import { handleApi, ok } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  return handleApi(async () => {
    await requireAdmin();
    const beneficiaries = await prisma.savedBeneficiary.findMany({
      orderBy: { createdAt: "desc" },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } }
    });
    return ok({ beneficiaries });
  });
}
