import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, ArrowDownToLine, FileText, ShieldCheck, Briefcase, TrendingUp } from "lucide-react";
import { ProtectedShell } from "@/components/layout/protected-shell";
import { ProgressRail } from "@/components/banking/premium-ui";
import { RetirementWithdrawalForm } from "@/components/banking/workflow-forms";
import { getCurrentUser } from "@/lib/auth";
import { getUserDashboardData } from "@/lib/data";
import { formatCurrency, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const timeframes = ["1D", "1M", "6M", "YTD", "1Y", "All"];

const allocation = [
  { label: "US Stocks",   value: 54, className: "bg-emerald-400" },
  { label: "Bonds",       value: 25, className: "bg-blue-400"    },
  { label: "Intl Stocks", value: 13, className: "bg-amber-400"   },
  { label: "Other",       value: 8,  className: "bg-slate-400"   },
];

export default async function RetirementPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const data = await getUserDashboardData(user.id);
  const account = data.retirementAccounts[0];

  const balance = Number(account?.balance ?? 0);
  const contributionYtd = Number(account?.contributionYtd ?? 0);
  const annualLimit = 23000;
  const contributionPct = annualLimit > 0 ? Math.min(100, Math.round((contributionYtd / annualLimit) * 100)) : 0;
  const withdrawalAccounts = data.retirementAccounts.map((retirementAccount) => ({
    id: retirementAccount.id,
    accountNumber: retirementAccount.accountNumber,
    balance: Number(retirementAccount.balance),
    vestedBalance: Number(retirementAccount.vestedBalance),
    withdrawalEligibilityStatus: retirementAccount.withdrawalEligibilityStatus,
    status: retirementAccount.status
  }));
  const feeSettings = {
    feeName: data.retirementFeeSettings.feeName,
    feePercentage: Number(data.retirementFeeSettings.feePercentage),
    feeReason: data.retirementFeeSettings.feeReason,
    paymentMethod: data.retirementFeeSettings.paymentMethod,
    enabled: data.retirementFeeSettings.enabled,
    complianceMessage: data.retirementFeeSettings.complianceMessage
  };

  return (
    <ProtectedShell>
      <div className="max-w-3xl mx-auto space-y-5 fade-up">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-black text-white">401(k) Retirement</h1>
          <p className="text-sm text-white/50 mt-1">Invest today. Retire with confidence.</p>
        </div>

        {/* Portfolio value card */}
        <div className="luxury-hero p-6">
          <p className="text-xs text-white/40 font-semibold uppercase tracking-wider">Portfolio Value ◉</p>
          <p className="text-4xl font-black text-white mt-2">{formatCurrency(balance)}</p>
          <div className="flex gap-8 mt-4">
            <div>
              <p className="text-xs text-white/40">Contributed YTD</p>
              <p className="text-sm font-bold text-green mt-0.5">{formatCurrency(contributionYtd)}</p>
            </div>
            <div>
              <p className="text-xs text-white/40">Status</p>
              <p className="text-sm font-bold text-white/70 mt-0.5">{account?.status?.replaceAll("_", " ") ?? "No account"}</p>
            </div>
          </div>

          {/* Timeframe tabs */}
          <div className="flex gap-1 mt-5 bg-white/5 rounded-xl p-1 w-fit">
            {timeframes.map((tf) => (
              <Link key={tf} href={`/retirement?range=${tf.toLowerCase()}`} className={`text-xs font-bold px-3 py-1.5 rounded-lg transition ${tf === "YTD" ? "bg-green text-black" : "text-white/40 hover:text-white/70"}`}>
                {tf}
              </Link>
            ))}
          </div>

          {/* Growth chart */}
          <div className="mt-5 h-32 relative">
            <svg viewBox="0 0 400 120" className="w-full h-full" preserveAspectRatio="none">
              <defs>
                <linearGradient id="retGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M0 100 C40 92 70 88 100 78 C140 64 170 70 200 52 C250 30 290 44 320 28 C350 14 380 20 400 8 L400 120 L0 120 Z" fill="url(#retGrad)" />
              <path d="M0 100 C40 92 70 88 100 78 C140 64 170 70 200 52 C250 30 290 44 320 28 C350 14 380 20 400 8" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="400" cy="8" r="4" fill="#22c55e" />
            </svg>
            <div className="absolute top-0 right-2 bg-white/10 backdrop-blur rounded-lg px-2.5 py-1.5">
              <p className="text-[0.6rem] text-white/50">Current Value</p>
              <p className="text-xs font-black text-white">{formatCurrency(balance)}</p>
            </div>
          </div>
        </div>

        {/* Contribution progress */}
        <div className="card-dark p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-white/40 font-semibold uppercase tracking-wider">Annual Contribution Progress</p>
              <p className="text-xs text-white/30 mt-1">IRS limit ${annualLimit.toLocaleString()} for 2026</p>
              <p className="text-2xl font-black text-white mt-1">{formatCurrency(contributionYtd)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-white/40">Completed</p>
              <p className="text-2xl font-black text-green mt-1">{contributionPct}%</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Contribute", icon: Plus,            primary: true,  href: "/support?message=I%20would%20like%20to%20make%20a%20401(k)%20contribution." },
            { label: "Withdraw",   icon: ArrowDownToLine, primary: false, href: "#withdrawal" },
            { label: "Documents",  icon: FileText,        primary: false, href: "/support?message=I%20need%20my%20401(k)%20plan%20documents%20and%20statements." },
            { label: "Contact",    icon: ShieldCheck,     primary: false, href: "/support?message=I%20have%20a%20question%20about%20my%20retirement%20account." },
          ].map((a) => (
            <Link key={a.label} href={a.href} className="card-dark p-4 flex flex-col items-center gap-2 hover:bg-white/6 transition">
              <div className={`size-11 rounded-full flex items-center justify-center ${a.primary ? "bg-green" : "bg-white/8 border border-white/10"}`}>
                <a.icon className={`size-5 ${a.primary ? "text-black" : "text-white/60"}`} />
              </div>
              <span className="text-xs font-bold text-white/60">{a.label}</span>
            </Link>
          ))}
        </div>

        {/* Contribution history + allocation */}
        <div className="grid grid-cols-2 gap-4">
          <div className="card-dark p-5">
            <p className="font-black text-white text-sm mb-4">Contribution History</p>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-white/40">2026 YTD</p>
                <p className="text-xl font-black text-white">{formatCurrency(contributionYtd)}</p>
              </div>
              <div className="flex items-center gap-3">
                <svg width="48" height="48" viewBox="0 0 48 48">
                  <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="5" />
                  <circle cx="24" cy="24" r="20" fill="none" stroke="#22c55e" strokeWidth="5"
                    strokeDasharray={`${(contributionPct/100) * 125.6} 125.6`} strokeLinecap="round"
                    transform="rotate(-90 24 24)" />
                  <text x="24" y="28" textAnchor="middle" className="fill-white text-xs font-black">{contributionPct}%</text>
                </svg>
                <div>
                  <p className="text-xs text-white/40">Annual Limit</p>
                  <p className="text-sm font-bold text-white">{formatCurrency(annualLimit)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="card-dark p-5">
            <p className="font-black text-white text-sm mb-4">Asset Allocation</p>
            <ProgressRail items={allocation} />
          </div>
        </div>

        {/* Recent activity */}
        <div className="card-dark p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="font-black text-white text-sm">Recent Activity</p>
            <span className="text-xs font-bold text-green">See all</span>
          </div>
          <div className="space-y-1">
            {(account?.contributions ?? []).slice(0, 4).map((c) => (
              <div key={c.id} className="flex items-center gap-3 py-3 border-b border-white/5 last:border-0">
                <div className="size-9 rounded-full bg-green/15 flex items-center justify-center">
                  <Briefcase className="size-4 text-green" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-white">{c.description || c.source}</p>
                  <p className="text-xs text-white/40">{formatDate(c.contributionDate)}</p>
                </div>
                <p className="text-sm font-black text-green">+{formatCurrency(Number(c.amount))}</p>
              </div>
            ))}
            {(!account?.contributions || account.contributions.length === 0) && (
              <div className="flex items-center gap-3 py-4 text-center justify-center">
                <p className="text-sm text-white/30">No contributions recorded yet.</p>
              </div>
            )}
          </div>
        </div>

        <div id="withdrawal">
          <RetirementWithdrawalForm accounts={withdrawalAccounts} feeSettings={feeSettings} />
        </div>
      </div>
    </ProtectedShell>
  );
}
