import { redirect } from "next/navigation";
import { WalletFlow } from "@/components/banking/wallet-flow";
import { ProtectedShell } from "@/components/layout/protected-shell";
import { getCurrentUser } from "@/lib/auth";
import { getUserDashboardData } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function WalletPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const data = await getUserDashboardData(user.id);
  const cryptoAccount = data.accounts.find((account) => account.type === "CRYPTO");
  const history = data.transactions
    .filter((transaction) => transaction.accountType === "CRYPTO" || transaction.type.startsWith("CRYPTO_"))
    .map((transaction) => ({
      ...transaction,
      amount: Number(transaction.amount)
    }));

  return (
    <ProtectedShell>
      <div className="mx-auto max-w-4xl space-y-5">
        <div>
          <h1 className="text-3xl font-black text-white">Wallet</h1>
          <p className="mt-1 text-sm text-white/50">Deposit, receive, send, withdraw, and swap with manual banking review.</p>
        </div>
        <WalletFlow wallets={data.wallets} history={history} cryptoBalance={Number(cryptoAccount?.balance ?? 0)} />
      </div>
    </ProtectedShell>
  );
}
