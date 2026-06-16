import { handleApi, ok } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { defaultRetirementFeeSettings } from "@/lib/domain";

export async function GET() {
  return handleApi(async () => {
    await requireAdmin();
    const [accounts, withdrawals, feeSettings] = await Promise.all([
      prisma.retirementAccount.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          user: true,
          contributions: { orderBy: { contributionDate: "desc" } },
          withdrawalRequests: { orderBy: { createdAt: "desc" }, include: { notes: { orderBy: { createdAt: "desc" } } } }
        }
      }),
      prisma.retirementWithdrawalRequest.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          user: true,
          retirementAccount: true,
          reviewedBy: true,
          notes: { orderBy: { createdAt: "desc" }, include: { author: true } }
        }
      }),
      prisma.retirementFeeSetting.findUnique({ where: { id: 1 } })
    ]);

    return ok({ accounts, withdrawals, feeSettings: feeSettings ?? defaultRetirementFeeSettings });
  });
}
