import { handleApi, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  return handleApi(async () => {
    const user = await requireUser();
    const balances = await prisma.userCryptoBalance.findMany({
      where: { userId: user.id },
      orderBy: { symbol: "asc" }
    });
    return ok({ balances });
  });
}
