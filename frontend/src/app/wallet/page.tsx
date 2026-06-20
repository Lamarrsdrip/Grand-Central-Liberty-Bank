import { redirect } from "next/navigation";
import { WalletFlow } from "@/components/banking/wallet-flow";
import { ProtectedShell } from "@/components/layout/protected-shell";
import { getCurrentUser } from "@/lib/auth";
import { getUserDashboardData } from "@/lib/data";
import { prisma } from "@/lib/db";
import { getAdminCryptoPrices, computeCryptoTotalUSD } from "@/lib/crypto-prices";
import { getServerTranslations } from "@/lib/i18n/server-locale";

export const dynamic = "force-dynamic";

export default async function WalletPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { tx } = getServerTranslations(user.preferredLocale);

  const [data, cryptoBalanceRecords, prices] = await Promise.all([
    getUserDashboardData(user.id),
    prisma.userCryptoBalance.findMany({ where: { userId: user.id } }),
    getAdminCryptoPrices()
  ]);

  const cryptoBalance = computeCryptoTotalUSD(cryptoBalanceRecords, prices);

  const history = data.transactions
    .filter((transaction) => transaction.accountType === "CRYPTO" || transaction.type.startsWith("CRYPTO_") || transaction.type === "SWAP_OUT" || transaction.type === "SWAP_IN")
    .map((transaction) => ({
      ...transaction,
      amount: Number(transaction.amount)
    }));

  return (
    <ProtectedShell>
      <div className="mx-auto max-w-4xl space-y-5">
        <div>
          <h1 className="text-3xl font-black text-white">{tx.nav_wallet}</h1>
          <p className="mt-1 text-sm text-white/50">{tx.wallet_page_desc}</p>
        </div>
        <WalletFlow wallets={data.wallets} history={history} cryptoBalance={cryptoBalance} />
      </div>
    </ProtectedShell>
  );
}
