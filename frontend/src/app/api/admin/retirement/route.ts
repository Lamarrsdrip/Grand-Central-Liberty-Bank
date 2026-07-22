import { handleApi, ok } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { defaultRetirementFeeSettings } from "@/lib/domain";
import { safeUserSelect } from "@/lib/user-select";

export async function GET() {
  return handleApi(async () => {
    await requireAdmin();
    const [accounts, withdrawals, feeSettings] = await Promise.all([
      prisma.retirementAccount.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: safeUserSelect },
          contributions: { orderBy: { contributionDate: "desc" } },
          withdrawalRequests: { orderBy: { createdAt: "desc" }, include: { notes: { orderBy: { createdAt: "desc" } } } }
        }
      }),
      prisma.retirementWithdrawalRequest.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: safeUserSelect },
          retirementAccount: true,
          reviewedBy: { select: safeUserSelect },
          notes: { orderBy: { createdAt: "desc" }, include: { author: { select: safeUserSelect } } }
        }
      }),
      prisma.retirementFeeSetting.findUnique({ where: { id: 1 } })
    ]);

    return ok({ accounts, withdrawals, feeSettings: feeSettings ?? defaultRetirementFeeSettings });
  });
}
