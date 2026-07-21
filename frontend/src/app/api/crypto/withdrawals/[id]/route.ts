import { handleApi, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const user = await requireUser();
    const { id } = await context.params;
    const withdrawal = await prisma.cryptoWithdrawalRequest.findFirst({
      where: { id, userId: user.id }
    });
    if (!withdrawal) {
      throw new Response("Withdrawal not found.", { status: 404 });
    }
    return ok({ withdrawal });
  });
}
