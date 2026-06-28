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

  const [data, cryptoBalanceRecords, prices, cryptoWithdrawals] = await Promise.all([
    getUserDashboardData(user.id),
    prisma.userCryptoBalance.findMany({ where: { userId: user.id } }),
    getAdminCryptoPrices(),
    prisma.cryptoWithdrawalRequest.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20
    })
  ]);

  const cryptoBalance = computeCryptoTotalUSD(cryptoBalanceRecords, prices);

  const txHistory = data.transactions
    .filter((transaction) => transaction.accountType === "CRYPTO" || transaction.type.startsWith("CRYPTO_") || transaction.type === "SWAP_OUT" || transaction.type === "SWAP_IN")
    .map((transaction) => ({
      id: transaction.id,
      type: transaction.type,
      amount: Number(transaction.amount),
      currency: transaction.currency,
      description: transaction.description,
      reference: transaction.reference,
      status: transaction.status,
      createdAt: transaction.createdAt,
      withdrawalId: null as string | null
    }));

  // Merge withdrawal requests into history (deduplicate by reference)
  const txRefs = new Set(txHistory.map((t) => `TX-${t.reference}`).concat(txHistory.map((t) => t.reference)));
  const withdrawalHistory = cryptoWithdrawals
    .filter((w) => !txRefs.has(`TX-${w.reference}`) && !txRefs.has(w.reference))
    .map((w) => ({
      id: w.id,
      type: "CRYPTO_WITHDRAW",
      amount: -Math.abs(w.amount),
      currency: "USD",
      description: `Withdraw ${w.asset} on ${w.network}`,
      reference: w.reference,
      status: w.status,
      createdAt: w.createdAt,
      withdrawalId: w.id
    }));

  const history = [...txHistory, ...withdrawalHistory].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

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
