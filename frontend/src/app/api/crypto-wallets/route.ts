import { handleApi, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { filterEnabledWallets } from "@/lib/domain";

export async function GET() {
  return handleApi(async () => {
    await requireUser();
    const wallets = await prisma.cryptoWallet.findMany({ orderBy: [{ symbol: "asc" }, { network: "asc" }] });

    return ok({ wallets: filterEnabledWallets(wallets) });
  });
}
