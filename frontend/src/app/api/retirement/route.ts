import { handleApi, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { defaultRetirementFeeSettings } from "@/lib/domain";

export async function GET() {
  return handleApi(async () => {
    const user = await requireUser();
    const [accounts, feeSettings, wallets] = await Promise.all([
      prisma.retirementAccount.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "asc" },
        include: {
          contributions: { orderBy: { contributionDate: "desc" } },
          withdrawalRequests: { orderBy: { createdAt: "desc" }, include: { notes: { where: { visibleToUser: true }, orderBy: { createdAt: "desc" } } } }
        }
      }),
      prisma.retirementFeeSetting.findUnique({ where: { id: 1 } }),
      prisma.cryptoWallet.findMany({ where: { enabled: true }, orderBy: [{ symbol: "asc" }] })
    ]);

    return ok({
      accounts,
      feeSettings: feeSettings ?? defaultRetirementFeeSettings,
      cryptoWallets: wallets
    });
  });
}
