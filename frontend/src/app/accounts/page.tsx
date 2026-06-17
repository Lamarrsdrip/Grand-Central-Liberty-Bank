import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, ShoppingCart, ArrowDownToLine } from "lucide-react";
import { ProtectedShell } from "@/components/layout/protected-shell";
import { AccountCard } from "@/components/banking/premium-ui";
import { money, accountLabel } from "@/components/banking/finance";
import { getCurrentUser } from "@/lib/auth";
import { getUserDashboardData } from "@/lib/data";
import { formatCurrency, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const data = await getUserDashboardData(user.id);

  return (
    <ProtectedShell>
      <div className="max-w-3xl mx-auto space-y-5 fade-up">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl luxury-hero p-6">
          <div className="relative z-10">
            <h1 className="text-3xl font-black text-white">Accounts</h1>
            <p className="text-sm text-white/50 mt-1">Your accounts at a glance</p>
          </div>
          <div className="absolute right-4 top-4 size-16 rounded-full bg-green/10 blur-xl" />
        </div>

        {/* Account cards */}
        <div className="space-y-4">
          {data.accounts.map((account, i) => (
            <AccountCard key={account.id} account={account} index={i} />
          ))}
        </div>

        {/* Add account */}
        <Link href="/support?message=I%20would%20like%20to%20open%20a%20new%20Grand%20Central%20Liberty%20Bank%20account." className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-white/10 rounded-2xl py-5 text-white/40 hover:text-white/70 hover:border-white/20 transition">
          <Plus className="size-5" />
          <span className="font-bold text-sm">Open new account</span>
        </Link>

        {/* Recent activity */}
        <div className="card-dark p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-black text-white">Recent Activity</h3>
            <Link href="/transfers" className="text-xs font-bold text-green hover:text-green-dim transition">See all</Link>
          </div>
          <div className="space-y-1">
            {data.transactions.slice(0, 6).map((tx) => {
              const amount = Number(tx.amount);
              const positive = amount >= 0;
              return (
                <div key={tx.id} className="flex items-center gap-3 py-3 border-b border-white/5 last:border-0">
                  <div className={`size-10 rounded-full flex items-center justify-center ${positive ? "bg-green/15" : "bg-white/8"}`}>
                    {positive
                      ? <ArrowDownToLine className="size-4 text-green" />
                      : <ShoppingCart className="size-4 text-white/50" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{tx.description}</p>
                    <p className="text-xs text-white/40 mt-0.5">{formatDate(tx.createdAt)} · {tx.accountType ? accountLabel(tx.accountType) : "Checking"}</p>
                  </div>
                  <p className={`text-sm font-black ${positive ? "text-green" : "text-white"}`}>
                    {positive ? "+" : ""}{formatCurrency(amount, tx.currency)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </ProtectedShell>
  );
}
