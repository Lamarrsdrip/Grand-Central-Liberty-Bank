import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight, CreditCard, Bell } from "lucide-react";
import { ProtectedShell } from "@/components/layout/protected-shell";
import { CryptoIcon } from "@/components/banking/crypto-icons";
import {
  AccountCard, CustomerTopBar, InsightPanel,
  MarketStrip, MiniChart, QuickActions,
  TotalAssetsCard, TransactionCards
} from "@/components/banking/premium-ui";
import { getCurrentUser } from "@/lib/auth";
import { getUserDashboardData } from "@/lib/data";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { getServerTranslations } from "@/lib/i18n/server-locale";
import { formatInCurrency } from "@/lib/currency";
import { getAdminCryptoPrices, computeCryptoTotalUSD } from "@/lib/crypto-prices";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [data, cryptoBalanceRecords, prices] = await Promise.all([
    getUserDashboardData(user.id),
    prisma.userCryptoBalance.findMany({ where: { userId: user.id } }),
    getAdminCryptoPrices()
  ]);

  const { tx } = getServerTranslations(user.preferredLocale);
  const pCurrency = user.preferredCurrency ?? "USD";

  const accountTotal    = data.accounts.reduce((s, a) => s + Number(a.balance), 0);
  const available       = data.accounts.reduce((s, a) => s + Number(a.availableBalance), 0);
  const retirementTotal = data.retirementAccounts.reduce((s, a) => s + Number(a.balance), 0);
  const totalAssets     = accountTotal + retirementTotal;

  const checking         = data.accounts.filter(a => a.type === "CHECKING").reduce((s, a) => s + Number(a.balance), 0);
  const crypto           = computeCryptoTotalUSD(cryptoBalanceRecords, prices);
  const primaryRetirement = data.retirementAccounts[0];
  const fallbackAccount  = data.accounts.find((account) => account.type === "CHECKING") ?? data.accounts[0];

  const selectedBalance = primaryRetirement
    ? {
        label: "401(k) Retirement",
        balance: primaryRetirement.balance,
        currency: "USD",
        detail: `Status ${primaryRetirement.status.replaceAll("_", " ")} •••• ${primaryRetirement.accountNumber.slice(-4)}`,
        href: "/retirement"
      }
    : fallbackAccount
      ? {
          label: `${fallbackAccount.type} Account`,
          balance: fallbackAccount.balance,
          currency: fallbackAccount.currency,
          detail: `${fallbackAccount.type} •••• ${fallbackAccount.accountNumber.slice(-4)}`,
          href: "/accounts"
        }
      : null;

  const wealthItems = [
    { label: "Checking",      value: checking,        color: "bg-blue-400"    },
    { label: "Crypto Wallet", value: crypto,          color: "bg-amber-400"   },
    { label: "401(k)",        value: retirementTotal, color: "bg-fuchsia-400" },
    { label: "Cards",         value: 0,               color: "bg-cyan-400"    },
  ];

  const filterTabs = [
    { label: tx.dash_filter_all,    key: "all"    },
    { label: tx.dash_filter_income, key: "income" },
    { label: tx.dash_filter_spend,  key: "spend"  },
  ];

  return (
    <ProtectedShell>
      <div className="max-w-4xl mx-auto space-y-5 fade-up">

        <CustomerTopBar user={user} notifCount={data.notifications.filter(n => !n.readAt).length} />

        {user.status === "FROZEN" && (
          <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-5 py-4">
            <p className="font-black text-amber-300">{tx.dash_frozen_title}</p>
            <p className="mt-1 text-sm text-amber-100/70">
              {tx.dash_frozen_body}
            </p>
          </div>
        )}

        <TotalAssetsCard
          total={totalAssets}
          available={available}
          items={wealthItems}
          todayChange={null}
          currency={user.preferredCurrency ?? "USD"}
        />

        {selectedBalance ? (
          <Link href={selectedBalance.href} className="card-dark block p-5 transition hover:bg-white/6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-white/40">{tx.dash_accounts}</p>
                <p className="mt-1 text-3xl font-black text-white">{formatInCurrency(Number(selectedBalance.balance), pCurrency)}</p>
                <p className="mt-1 text-sm text-white/40">{selectedBalance.label} · {selectedBalance.detail}</p>
              </div>
              <ArrowRight className="size-5 text-green" />
            </div>
          </Link>
        ) : null}

        <div className="card-dark p-4">
          <QuickActions />
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
          <div className="card-dark p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-white">{tx.dash_recent_transactions}</h3>
              <div className="flex items-center gap-1">
                {filterTabs.map((tab, i) => (
                  <Link
                    key={tab.key}
                    href={`/accounts?filter=${tab.key}`}
                    className={`text-xs font-bold px-3 py-1.5 rounded-full transition ${
                      i === 0 ? "bg-white/15 text-white" : "text-white/40 hover:text-white/70"
                    }`}
                  >
                    {tab.label}
                  </Link>
                ))}
                <Link href="/accounts" className="text-xs font-bold text-green ml-2 hover:text-green-dim transition">
                  {tx.dash_view_all} →
                </Link>
              </div>
            </div>
            <TransactionCards transactions={data.transactions} />
          </div>
          <InsightPanel total={totalAssets} retirement={retirementTotal} />
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-black text-white">{tx.nav_accounts}</h3>
            <Link href="/accounts" className="text-xs font-bold text-green hover:text-green-dim transition">{tx.dash_view_all} →</Link>
          </div>
          <div className="flex gap-4 overflow-x-auto scrollbar-none pb-1">
            {data.accounts.slice(0, 4).map((account, i) => (
              <div key={account.id} className="shrink-0 w-64">
                <AccountCard account={account} index={i} />
              </div>
            ))}
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-white/10 p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-white/40 font-semibold mb-1">{tx.dash_premium_card}</p>
            <p className="text-lg font-black text-white">{tx.dash_premium_cta}</p>
            <Link href="/cards" className="text-xs font-bold text-green mt-2 inline-block hover:text-green-dim transition">
              {tx.dash_learn_more} →
            </Link>
          </div>
          <div className="w-32 h-20 bg-gradient-to-br from-slate-700 to-slate-900 rounded-xl border border-white/10 flex items-center justify-center">
            <CreditCard className="size-8 text-white/20" />
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-green/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Link href="/wallet" className="card-dark p-5 hover:bg-white/6 transition rounded-2xl block">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-white/40 uppercase tracking-wider">{tx.nav_crypto}</p>
              <span className="text-xs font-bold text-white/30 bg-white/5 px-2 py-0.5 rounded-full">{data.wallets.length} networks</span>
            </div>
            <p className="text-xl font-black text-white">{formatInCurrency(crypto, pCurrency)}</p>
            <div className="mt-2 flex items-center justify-between gap-2">
              <p className="text-xs text-white/30">{data.wallets.length} active networks</p>
              <div className="flex -space-x-2">
                {["BTC", "ETH", "USDT", "SOL"].map((symbol) => (
                  <CryptoIcon key={symbol} symbol={symbol} className="size-7 border border-[#161c28]" />
                ))}
              </div>
            </div>
            <MiniChart className="mt-3 h-10 w-full" color="#f59e0b" path="M0 30 C14 20 26 28 40 14 C52 4 64 18 80 8" />
          </Link>

          <Link href="/retirement" className="card-dark p-5 hover:bg-white/6 transition rounded-2xl block">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-white/40 uppercase tracking-wider">401(k)</p>
              <span className="text-xs font-bold text-white/30 bg-white/5 px-2 py-0.5 rounded-full">
                {data.retirementAccounts.length > 0 ? tx.dash_active : tx.dash_inactive}
              </span>
            </div>
            <p className="text-xl font-black text-white">{formatInCurrency(retirementTotal, pCurrency)}</p>
            <p className="text-xs text-white/30 mt-0.5">
              {primaryRetirement?.investmentGrowthPlaceholder ?? "Projected growth active"}
            </p>
            <MiniChart className="mt-3 h-10 w-full" color="#6366f1" path="M0 28 C16 20 28 24 42 14 C56 4 66 18 80 10" />
          </Link>
        </div>

        <div className="card-dark p-4">
          <p className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3">{tx.dash_exchange_rates}</p>
          <MarketStrip />
        </div>

        {data.notifications.length > 0 && (
          <div className="card-dark p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-white">{tx.dash_notifications}</h3>
              <Link href="/notifications" className="text-xs font-bold text-green hover:text-green-dim transition">{tx.dash_see_all}</Link>
            </div>
            <div className="space-y-3">
              {data.notifications.slice(0, 3).map((n) => (
                <div key={n.id} className={`flex items-start gap-3 p-3 rounded-xl ${n.readAt ? "opacity-50" : ""}`}>
                  <div className="size-8 rounded-full bg-green/15 flex items-center justify-center shrink-0">
                    <Bell className="size-3.5 text-green" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white">{n.title}</p>
                    <p className="text-xs text-white/40 mt-0.5 line-clamp-2">{n.body}</p>
                  </div>
                  <p className="text-[0.6rem] text-white/25 shrink-0">{formatDate(n.createdAt)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ProtectedShell>
  );
}
