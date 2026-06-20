import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, ShoppingCart, ArrowDownToLine, Download } from "lucide-react";
import { ProtectedShell } from "@/components/layout/protected-shell";
import { AccountCard } from "@/components/banking/premium-ui";
import { accountLabel } from "@/components/banking/finance";
import { getCurrentUser } from "@/lib/auth";
import { getUserDashboardData } from "@/lib/data";
import { formatCurrency, formatDate } from "@/lib/utils";
import { DepositSection } from "@/components/banking/deposit-section";
import { getServerTranslations } from "@/lib/i18n/server-locale";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { tx } = getServerTranslations(user.preferredLocale);
  const data = await getUserDashboardData(user.id);

  return (
    <ProtectedShell>
      <div className="max-w-3xl mx-auto space-y-5 fade-up">
        <div className="relative overflow-hidden rounded-2xl luxury-hero p-6">
          <div className="relative z-10">
            <h1 className="text-3xl font-black text-white">{tx.accounts_page_title}</h1>
            <p className="text-sm text-white/50 mt-1">{tx.accounts_page_desc}</p>
          </div>
          <a
            href="/api/user/statement"
            download
            className="absolute top-4 right-4 z-10 flex items-center gap-1.5 bg-white/10 hover:bg-white/15 border border-white/15 rounded-xl px-3 py-2 text-xs font-bold text-white/70 hover:text-white transition"
          >
            <Download className="size-3.5" />
            {tx.accounts_statement}
          </a>
          <div className="absolute right-4 bottom-0 size-16 rounded-full bg-green/10 blur-xl" />
        </div>

        <div className="space-y-4">
          {data.accounts.map((account, i) => (
            <AccountCard key={account.id} account={account} index={i} />
          ))}
        </div>

        <DepositSection accounts={data.accounts} wallets={data.wallets} />

        <Link href="/support?message=I%20would%20like%20to%20open%20a%20new%20Grand%20Central%20Liberty%20Bank%20account." className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-white/10 rounded-2xl py-5 text-white/40 hover:text-white/70 hover:border-white/20 transition">
          <Plus className="size-5" />
          <span className="font-bold text-sm">{tx.accounts_open_new}</span>
        </Link>

        <div className="card-dark p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-black text-white">{tx.accounts_recent}</h3>
            <a href="/api/user/statement" download className="text-xs font-bold text-green hover:text-green-dim transition flex items-center gap-1"><Download className="size-3" />{tx.accounts_export}</a>
          </div>
          <div className="space-y-1">
            {data.transactions.slice(0, 6).map((t) => {
              const amount = Number(t.amount);
              const positive = amount >= 0;
              return (
                <div key={t.id} className="flex items-center gap-3 py-3 border-b border-white/5 last:border-0">
                  <div className={`size-10 rounded-full flex items-center justify-center ${positive ? "bg-green/15" : "bg-white/8"}`}>
                    {positive
                      ? <ArrowDownToLine className="size-4 text-green" />
                      : <ShoppingCart className="size-4 text-white/50" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{t.description}</p>
                    <p className="text-xs text-white/40 mt-0.5">{formatDate(t.createdAt)} · {t.accountType ? accountLabel(t.accountType) : "Checking"}</p>
                  </div>
                  <p className={`text-sm font-black ${positive ? "text-green" : "text-white"}`}>
                    {positive ? "+" : ""}{formatCurrency(amount, t.currency)}
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
