import { redirect } from "next/navigation";
import {
  ArrowDownToLine, ArrowUpFromLine, RefreshCcw, QrCode,
  Send, MoreHorizontal
} from "lucide-react";
import { ProtectedShell } from "@/components/layout/protected-shell";
import { MiniChart, ProgressRail } from "@/components/banking/premium-ui";
import { cryptoAssets, money } from "@/components/banking/finance";
import { getCurrentUser } from "@/lib/auth";
import { getUserDashboardData } from "@/lib/data";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const actions = [
  { label: "Deposit",  icon: ArrowDownToLine },
  { label: "Withdraw", icon: ArrowUpFromLine },
  { label: "Swap",     icon: RefreshCcw      },
  { label: "Receive",  icon: QrCode          },
  { label: "Send",     icon: Send            },
  { label: "More",     icon: MoreHorizontal  },
];

const topMovers = [
  { symbol: "SOL",  change: "+3.21%", color: "#8b5cf6" },
  { symbol: "BTC",  change: "+2.35%", color: "#f59e0b" },
  { symbol: "DOGE", change: "+2.10%", color: "#f97316" },
];

const allocation = [
  { label: "BTC",   value: 56.7, className: "bg-amber-400"   },
  { label: "ETH",   value: 18.1, className: "bg-indigo-400"  },
  { label: "USDT",  value: 6.7,  className: "bg-emerald-400" },
  { label: "Others",value: 18.5, className: "bg-slate-400"   },
];

export default async function CryptoPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const data = await getUserDashboardData(user.id);
  const cryptoAccount = data.accounts.find(a => a.type === "CRYPTO");
  const cryptoBalance = Number(cryptoAccount?.balance ?? 48693.21);

  // Fetch real per-symbol crypto balances
  const cryptoBalanceRecords = await prisma.userCryptoBalance.findMany({
    where: { userId: user.id }
  });
  const balanceMap = Object.fromEntries(cryptoBalanceRecords.map(b => [b.symbol, b.balance]));

  return (
    <ProtectedShell>
      <div className="max-w-3xl mx-auto space-y-5 fade-up">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-black text-white">Crypto</h1>
            <p className="text-sm text-white/50 mt-1">Secure. Regulated. Built for you.</p>
          </div>
          <a
            href="/crypto/swap"
            className="flex items-center gap-2 rounded-lg bg-white/8 border border-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/15 transition"
          >
            <RefreshCcw className="size-4" />
            Swap
          </a>
        </div>

        {/* Total value card */}
        <div className="luxury-hero p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-white/40 font-semibold uppercase tracking-wider">Total Crypto Value ◉</p>
              <p className="text-4xl font-black text-white mt-2">{money(cryptoBalance)}</p>
              <p className="text-sm text-green mt-1">+$1,860.42 (4.00%) 24h</p>
            </div>
            <svg width="72" height="72" viewBox="0 0 72 72">
              {allocation.reduce((acc, seg, i) => {
                const r = 30, circ = 2 * Math.PI * r;
                const len = (seg.value / 100) * circ;
                const colors = ["#f59e0b","#6366f1","#10b981","#94a3b8"];
                acc.elements.push(
                  <circle key={i} cx="36" cy="36" r={r} fill="none"
                    stroke={colors[i]} strokeWidth="8"
                    strokeDasharray={`${len} ${circ - len}`}
                    strokeDashoffset={-acc.offset}
                    transform="rotate(-90 36 36)" />
                );
                acc.offset += len;
                return acc;
              }, { elements: [] as React.ReactNode[], offset: 0 }).elements}
            </svg>
          </div>
        </div>

        {/* Coin list */}
        <div className="card-dark p-2">
          {cryptoAssets.map((coin) => (
            <div key={coin.symbol} className="coin-row px-3">
              <div className="size-10 rounded-full flex items-center justify-center font-black text-black text-sm shrink-0" style={{ background: coin.color }}>
                {coin.symbol[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-white text-sm">{coin.symbol}</p>
                <p className="text-xs text-white/40">{coin.name}</p>
              </div>
              <div className="text-right mr-3">
                <p className="font-bold text-white text-sm">{(balanceMap[coin.symbol] ?? 0).toLocaleString("en-US", { maximumFractionDigits: 8 })}</p>
                <p className="text-xs text-white/40">{coin.price}</p>
              </div>
              <div className="text-right w-16 shrink-0">
                <p className={`text-xs font-bold ${coin.positive ? "text-green" : "text-red-400"}`}>{coin.change}</p>
                <MiniChart className="h-6 w-16 mt-1" color={coin.positive ? "#22c55e" : "#f87171"}
                  path={coin.positive ? "M0 24 C12 18 24 22 40 10 C56 2 68 12 80 6" : "M0 6 C12 12 24 8 40 16 C56 22 68 14 80 20"} />
              </div>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="card-dark p-4">
          <div className="grid grid-cols-6 gap-2">
            {actions.map((a) => (
              <button key={a.label} className="flex flex-col items-center gap-2 py-2 group">
                <div className="size-11 rounded-full bg-white/8 border border-white/10 flex items-center justify-center group-hover:bg-green/15 transition">
                  <a.icon className="size-4 text-white/70 group-hover:text-green transition" />
                </div>
                <span className="text-[0.65rem] font-bold text-white/50">{a.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Allocation + Top movers */}
        <div className="grid grid-cols-2 gap-4">
          <div className="card-dark p-5">
            <p className="font-black text-white text-sm mb-4">Portfolio Allocation</p>
            <ProgressRail items={allocation} />
          </div>
          <div className="card-dark p-5">
            <p className="font-black text-white text-sm mb-4">Top Movers (24h)</p>
            <div className="space-y-3">
              {topMovers.map((m) => (
                <div key={m.symbol} className="flex items-center gap-3">
                  <div className="size-8 rounded-full flex items-center justify-center font-black text-black text-xs" style={{ background: m.color }}>
                    {m.symbol[0]}
                  </div>
                  <span className="flex-1 font-bold text-white text-sm">{m.symbol}</span>
                  <span className="text-xs font-bold text-green">{m.change}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </ProtectedShell>
  );
}
