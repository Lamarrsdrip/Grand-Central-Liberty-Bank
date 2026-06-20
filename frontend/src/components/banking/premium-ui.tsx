"use client";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  Bell,
  Bitcoin,
  Building2,
  CreditCard,
  Globe2,
  Landmark,
  LineChart,
  LockKeyhole,
  PiggyBank,
  QrCode,
  RefreshCcw,
  ScanLine,
  Search,
  ShieldCheck,
  Smartphone,
  TrendingUp,
  WalletCards
} from "lucide-react";
import { cn, formatCurrency, formatDate, initials } from "@/lib/utils";
import {
  cryptoAssets,
  marketSignals,
  accountLabel,
  statusText,
  money,
  compactMoney
} from "@/components/banking/finance";
import { useTranslations } from "@/components/layout/translation-provider";
import { formatInCurrency, compactInCurrency } from "@/lib/currency";

/* ── Re-export pure helpers so existing client imports keep working ─ */
export { cryptoAssets, marketSignals, accountLabel, statusText, money, compactMoney };

/* ── Types ─────────────────────────────── */
export type FinanceAccount = {
  id: string;
  type: string;
  accountNumber: string;
  balance: unknown;
  availableBalance?: unknown;
  currency: string;
  status?: string;
  freezeReason?: string | null;
};

export type FinanceTransaction = {
  id: string;
  createdAt: Date;
  description: string;
  amount: unknown;
  currency: string;
  status: string;
  accountType?: string;
  accountNumber?: string;
  reference?: string;
};

/* ── Data & pure helpers (re-exported from non-client module) ───── */

/* ── SVG Mini chart ─────────────────────── */
export function MiniChart({ className, path, color = "#22c55e" }: {
  className?: string; path?: string; color?: string;
}) {
  const d = path ?? "M0 32 C14 24 28 18 42 22 C56 26 66 10 80 8";
  return (
    <svg viewBox="0 0 80 40" className={cn("overflow-visible", className)} aria-hidden="true">
      <defs>
        <linearGradient id={`g${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={`${d} L80 40 L0 40 Z`} fill={`url(#g${color.replace("#","")})`}/>
      <path d={d} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

/* ── ProgressRail ─────────────────────── */
export function ProgressRail({ items }: {
  items: Array<{ label: string; value: number; className?: string; color?: string }>
}) {
  const total = items.reduce((s, i) => s + i.value, 0) || 1;
  return (
    <div className="space-y-3">
      <div className="flex h-2.5 overflow-hidden rounded-full gap-0.5">
        {items.map((item) => (
          <div
            key={item.label}
            className={cn("transition-all duration-700", item.className ?? "bg-primary")}
            style={{ width: `${(item.value / total) * 100}%` }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div className={cn("size-2 rounded-full", item.className ?? "bg-primary")} />
            <span className="text-xs font-semibold text-white/60">{item.label}</span>
            <span className="text-xs font-bold text-white/80">{Math.round((item.value / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── BrandMark ─────────────────────────── */
export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-3">
      <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 shadow-lg">
        <Building2 className="size-4 text-white" />
      </div>
      {!compact && (
        <div className="leading-tight">
          <p className="text-sm font-black text-white">GRAND CENTRAL</p>
          <p className="text-[0.6rem] font-bold uppercase tracking-[0.28em] text-white/40">Liberty Bank</p>
        </div>
      )}
    </Link>
  );
}

/* ── Total Assets Card (matches screenshot) ─ */
export function TotalAssetsCard({
  total, available, items, todayChange = null, currency = "USD"
}: {
  total: number;
  available: number;
  items: Array<{ label: string; value: number; color: string }>;
  todayChange?: string | null;
  currency?: string;
}) {
  const { t } = useTranslations();
  return (
    <div className="assets-hero p-5 sm:p-7 fade-up">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-white/50 uppercase tracking-wider">{t("dash_total_balance")}</span>
            <span className="text-xs text-white/30">◉</span>
            {currency !== "USD" && (
              <span className="text-[0.6rem] font-bold text-emerald-400/70 bg-emerald-400/10 px-1.5 py-0.5 rounded">{currency}</span>
            )}
          </div>
          <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-none">
            {formatInCurrency(total, currency)}
          </h2>
          {todayChange && <p className="mt-2 text-sm font-semibold text-green">{todayChange} today</p>}
          <p className="mt-1 text-xs font-bold text-white/35">{t("dash_available")} {formatInCurrency(available, currency)}</p>
        </div>
        <Link href="/accounts" className="text-xs font-bold text-white/40 hover:text-white/70 transition mt-1">
          Net Worth →
        </Link>
      </div>

      {/* Chart */}
      <div className="mt-5 h-20">
        <MiniChart
          className="h-full w-full"
          color="#22c55e"
          path="M0 60 C12 44 22 52 34 36 C46 20 56 28 68 18 C76 10 84 14 96 8"
        />
      </div>

      {/* Account breakdown pills */}
      <div className="mt-4 flex gap-2 overflow-x-auto scrollbar-none pb-1">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-2 rounded-xl bg-white/8 border border-white/8 px-3 py-2 shrink-0">
            <div className={cn("size-2 rounded-full", item.color)} />
            <div>
              <p className="text-[0.65rem] font-semibold text-white/50 whitespace-nowrap">{item.label}</p>
              <p className="text-xs font-black text-white whitespace-nowrap">{compactInCurrency(item.value, currency)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Quick Actions (matches screenshot exactly) ─ */
export function QuickActions() {
  const { t } = useTranslations();
  const quickActions = [
    { label: t("transfer_title") || "Transfer", href: "/transfers", bg: "#1a2a3a", icon: "↗" },
    { label: "Pay Bills",                        href: "/transfers", bg: "#1a1a2a", icon: "📄" },
    { label: t("dash_add_money") || "Deposit",  href: "/wallet",    bg: "#1a2a20", icon: "⬇" },
    { label: t("dash_send_money") || "Send",    href: "/transfers", bg: "#2a1a1a", icon: "↑" },
    { label: t("nav_wallet") || "Wallet",       href: "/wallet",    bg: "#1a2520", icon: "⇄" },
    { label: t("nav_more") || "More",           href: "/more",      bg: "#1a1a1a", icon: "⋯" },
  ];
  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-1">
      {quickActions.map((action) => (
        <Link key={action.label} href={action.href} className="quick-action text-center group">
          <div
            className="quick-action-icon mx-auto mb-1 group-hover:scale-110 transition-transform duration-200"
            style={{ background: action.bg }}
          >
            <span className="text-xl">{action.icon}</span>
          </div>
          <span className="text-[0.7rem] font-bold text-white/60 group-hover:text-white/90 transition-colors">{action.label}</span>
        </Link>
      ))}
    </div>
  );
}

export function QuickActionGrid() {
  return <QuickActions />;
}

/* ── Transaction row (matches screenshot) ─ */
const merchantIcons: Record<string, { bg: string; initial: string }> = {
  "Starbucks": { bg: "#00704a", initial: "S" },
  "Amazon":    { bg: "#ff9900", initial: "A" },
  "Salary":    { bg: "#22c55e", initial: "↑" },
  "Uber":      { bg: "#000000", initial: "U" },
  "Crypto":    { bg: "#f59e0b", initial: "₿" },
  "default":   { bg: "#374151", initial: "T" },
};

function getMerchantStyle(desc: string) {
  const key = Object.keys(merchantIcons).find(k => desc.toLowerCase().includes(k.toLowerCase()));
  return merchantIcons[key ?? "default"];
}

export function TransactionRow({ tx }: { tx: FinanceTransaction }) {
  const amount = Number(tx.amount);
  const positive = amount >= 0;
  const m = getMerchantStyle(tx.description);
  return (
    <div className="tx-item">
      <div className="tx-icon text-white text-sm font-black" style={{ background: m.bg }}>
        {m.initial}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white truncate">{tx.description}</p>
        <p className="text-xs text-white/40 mt-0.5">{formatDate(tx.createdAt)}</p>
      </div>
      <div className="text-right">
        <p className={cn("text-sm font-black", positive ? "text-green" : "text-white")}>
          {positive ? "+" : ""}{formatCurrency(amount, tx.currency)}
        </p>
      </div>
    </div>
  );
}

export function TransactionCards({ transactions }: { transactions: FinanceTransaction[] }) {
  if (!transactions.length) {
    return <p className="text-sm text-white/40 text-center py-8">No transactions yet</p>;
  }
  return (
    <div>
      {transactions.slice(0, 8).map((tx) => (
        <TransactionRow key={tx.id} tx={tx} />
      ))}
    </div>
  );
}

/* ── Account Card (matches screenshot) ─ */
const accountCardStyles: Record<string, string> = {
  CHECKING: "account-card-checking",
  SAVINGS: "account-card-savings",
  BUSINESS: "account-card-business",
  JOINT: "account-card-joint",
  CRYPTO: "account-card-business",
};

const GCLB_ROUTING = "026009593";
const GCLB_SWIFT   = "GCLBUS33";
const GCLB_BANK    = "Grand Central Liberty Bank";
const GCLB_ADDRESS = "200 Liberty Plaza, New York, NY 10006";

function CopyText({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      title={`Copy ${label}`}
      className="group flex items-center gap-1 text-left"
      onClick={async () => {
        await navigator.clipboard.writeText(value).catch(() => null);
        setCopied(true);
        setTimeout(() => setCopied(false), 1400);
      }}
    >
      <span className="font-mono text-xs text-white/70 group-hover:text-white transition">{value}</span>
      <span className={`text-[0.6rem] font-bold ml-1 ${copied ? "text-green" : "text-white/20 group-hover:text-white/50"}`}>
        {copied ? "✓" : "copy"}
      </span>
    </button>
  );
}

export function AccountCard({ account }: { account: FinanceAccount; index?: number }) {
  const { tx } = useTranslations();
  const [showDetails, setShowDetails] = useState(false);
  const cardClass = accountCardStyles[account.type] ?? "account-card-checking";
  const typeLabel = accountLabel(account.type).toUpperCase();
  const isCrypto = account.type === "CRYPTO";

  return (
    <div className={cn("rounded-2xl p-5 border border-white/10 text-white", cardClass)}>
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-[0.65rem] font-bold uppercase tracking-wider text-white/50">{typeLabel}</p>
          <p className="text-sm font-bold text-white/80 mt-0.5">{accountLabel(account.type)}</p>
        </div>
        <div className="flex items-center gap-1.5">
          {account.status === "FROZEN" && (
            <span className="text-xs font-bold text-amber-400 bg-amber-400/15 px-2 py-0.5 rounded-full">{tx.account_frozen}</span>
          )}
          <span className="text-[0.6rem] font-bold uppercase text-white/30 border border-white/10 rounded px-1.5 py-0.5">{account.currency}</span>
        </div>
      </div>

      <p className="text-2xl font-black tracking-tight">{money(account.balance, account.currency)}</p>
      <p className="text-xs text-white/40 mt-0.5">{tx.account_available} {money(account.availableBalance ?? account.balance, account.currency)}</p>

      <div className="mt-4 flex items-center gap-2">
        <span className="text-[0.65rem] text-white/30 font-semibold">{tx.account_acct}</span>
        <CopyText value={account.accountNumber} label={tx.account_number_label} />
      </div>

      <button
        type="button"
        className="mt-3 text-[0.65rem] font-bold text-white/40 hover:text-white/70 transition"
        onClick={() => setShowDetails((v) => !v)}
      >
        {showDetails ? tx.account_hide_details : tx.account_show_details}
      </button>

      {showDetails && (
        <div className="mt-3 rounded-xl bg-black/30 border border-white/8 p-3 space-y-2.5">
          <p className="text-[0.6rem] font-black uppercase tracking-widest text-white/30 mb-2">{tx.account_details_title}</p>
          <div className="grid gap-2 text-xs">
            <div className="flex justify-between items-start gap-2">
              <span className="text-white/40 shrink-0">{tx.account_bank_label}</span>
              <span className="font-semibold text-right text-white/80">{GCLB_BANK}</span>
            </div>
            <div className="flex justify-between items-start gap-2">
              <span className="text-white/40 shrink-0">{tx.account_address_label}</span>
              <span className="font-semibold text-right text-white/70 text-[0.65rem]">{GCLB_ADDRESS}</span>
            </div>
            <div className="flex justify-between items-center gap-2">
              <span className="text-white/40 shrink-0">{tx.account_number_label}</span>
              <CopyText value={account.accountNumber} label={tx.account_number_label} />
            </div>
            {!isCrypto && (
              <>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-white/40 shrink-0">{tx.account_routing_label}</span>
                  <CopyText value={GCLB_ROUTING} label={tx.account_routing_label} />
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-white/40 shrink-0">{tx.account_swift_label}</span>
                  <CopyText value={GCLB_SWIFT} label={tx.account_swift_label} />
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-white/40 shrink-0">{tx.account_iban_label}</span>
                  <CopyText value={`US98 GCLB ${account.accountNumber.slice(0,4)} ${account.accountNumber.slice(4)}`} label={tx.account_iban_label} />
                </div>
              </>
            )}
            <div className="flex justify-between items-center gap-2">
              <span className="text-white/40 shrink-0">{tx.account_currency_label}</span>
              <span className="font-bold text-white/80">{account.currency}</span>
            </div>
            {isCrypto && (
              <Link href="/crypto" className="mt-1 block text-center text-[0.65rem] font-bold text-green hover:text-green-dim border border-green/20 rounded-lg py-1.5 transition">
                {tx.account_crypto_deposit} →
              </Link>
            )}
          </div>
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <Link href="/support?message=I%20need%20help%20freezing%20or%20unfreezing%20my%20account." className="text-[0.65rem] font-bold text-white/70 border border-white/10 rounded-lg px-2.5 py-1.5 hover:bg-white/10 transition">{tx.account_freeze_btn}</Link>
        <Link href="/accounts" className="text-[0.65rem] font-bold text-white/70 border border-white/10 rounded-lg px-2.5 py-1.5 hover:bg-white/10 transition">{tx.account_statements_btn}</Link>
        <Link href="/profile" className="text-[0.65rem] font-bold text-white/70 border border-white/10 rounded-lg px-2.5 py-1.5 hover:bg-white/10 transition">{tx.account_manage_btn}</Link>
      </div>
    </div>
  );
}

/* ── Insight Panel ─────────────────────── */
export function InsightPanel({ total, retirement }: { total: number; retirement: number }) {
  const { tx } = useTranslations();
  const spending = total * 0.042;
  const retirementShare = total > 0 ? Math.round((retirement / total) * 100) : 0;
  const cats = [
    { label: "Shopping",       pct: 32, color: "#6366f1" },
    { label: "Food & Dining",  pct: 24, color: "#22c55e" },
    { label: "Transport",      pct: 15, color: "#f59e0b" },
    { label: "Bills & Utilities", pct: 14, color: "#3b82f6" },
    { label: "Other",          pct: 15, color: "#64748b" },
  ];

  // Build donut
  let offset = 0;
  const r = 36, circ = 2 * Math.PI * r;
  const segments = cats.map(c => {
    const len = (c.pct / 100) * circ;
    const seg = { ...c, dashArray: `${len} ${circ - len}`, dashOffset: -offset };
    offset += len;
    return seg;
  });

  return (
    <div className="card-dark p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-black text-white">{tx.insight_panel_title}</h3>
          <p className="text-xs text-white/40 mt-0.5">{tx.insight_this_month}</p>
        </div>
        <select className="text-xs bg-transparent text-white/50 border-0 outline-none">
          <option>{tx.insight_filter_month}</option>
        </select>
      </div>
      <p className="text-xs text-white/40 mb-1">{tx.insight_spending}</p>
      <p className="text-2xl font-black text-white">{money(spending)}</p>
      <p className="text-xs text-white/30 mb-5">-8.6% vs last month · 401(k) {retirementShare}% of assets</p>

      {/* Donut chart */}
      <div className="flex items-center gap-5">
        <svg width="80" height="80" viewBox="0 0 80 80">
          {segments.map((s, i) => (
            <circle
              key={i}
              cx="40" cy="40" r={r}
              fill="none"
              stroke={s.color}
              strokeWidth="10"
              strokeDasharray={s.dashArray}
              strokeDashoffset={s.dashOffset}
              strokeLinecap="butt"
              transform="rotate(-90 40 40)"
            />
          ))}
        </svg>
        <div className="space-y-1.5 flex-1">
          {cats.map(c => (
            <div key={c.label} className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="size-2 rounded-full" style={{ background: c.color }} />
                <span className="text-xs text-white/50">{c.label}</span>
              </div>
              <span className="text-xs font-bold text-white/70">{c.pct}%</span>
            </div>
          ))}
        </div>
      </div>
      <Link href="/accounts" className="mt-4 block text-xs font-bold text-green hover:text-green-dim transition">
        {tx.insight_view_full} →
      </Link>
    </div>
  );
}

/* ── Customer Top Bar ─────────────────── */
export function CustomerTopBar({ user, notifCount = 0 }: {
  user: { firstName: string; lastName: string };
  notifCount?: number;
}) {
  const { t } = useTranslations();
  return (
    <div className="flex items-center justify-between fade-up">
      <div className="flex items-center gap-3">
        <div className="size-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-sm font-black text-white shadow-lg">
          {initials(user.firstName, user.lastName)}
        </div>
        <div>
          <p className="text-xs font-semibold text-white/40">{t("dash_welcome")}</p>
          <div className="flex items-center gap-1.5">
            <p className="text-xl font-black text-white">{user.firstName}</p>
            <span className="size-2 rounded-full bg-green pulse-dot" />
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Link href="/notifications" className="relative size-9 flex items-center justify-center rounded-full bg-white/8 border border-white/10 text-white/60 hover:text-white transition" aria-label="Notifications">
          <Bell className="size-4" />
          {notifCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 size-4 flex items-center justify-center rounded-full bg-red-500 text-[0.6rem] font-black text-white">
              {Math.min(notifCount, 9)}
            </span>
          )}
        </Link>
        <Link href="/wallet" className="size-9 flex items-center justify-center rounded-full bg-white/8 border border-white/10 text-white/60 hover:text-white transition" aria-label="Scan QR">
          <ScanLine className="size-4" />
        </Link>
        <Link href="/support" className="size-9 flex items-center justify-center rounded-full bg-white/8 border border-white/10 text-white/60 hover:text-white transition" aria-label="Search support">
          <Search className="size-4" />
        </Link>
      </div>
    </div>
  );
}

/* ── Market Strip (landing page) ─────────── */
export function MarketStrip() {
  return (
    <div className="flex items-center gap-3 overflow-x-auto scrollbar-none py-2">
      <div className="flex items-center gap-2 shrink-0 text-xs font-bold text-white/40 mr-2">
        <span className="size-1.5 rounded-full bg-green pulse-dot" />
        Exchange Rates Live
      </div>
      {marketSignals.map((s) => (
        <div key={s.pair} className="flex items-center gap-3 shrink-0 bg-white/6 border border-white/8 rounded-xl px-4 py-2.5">
          <span className="text-xs font-bold text-white/50">{s.pair}</span>
          <span className="text-sm font-black text-white">{s.value}</span>
          <span className={cn("text-xs font-bold", s.positive ? "text-green" : "text-red-400")}>{s.change}</span>
          <svg width="48" height="20" viewBox="0 0 48 20">
            <path
              d={s.positive ? "M0 15 C8 12 16 8 24 6 C32 4 40 8 48 4" : "M0 4 C8 8 16 6 24 10 C32 14 40 8 48 12"}
              fill="none"
              stroke={s.positive ? "#22c55e" : "#f87171"}
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
      ))}
    </div>
  );
}

/* ── Public Phone Mockup ─────────────────── */
export function PublicPhoneMockup() {
  return (
    <div className="relative w-[17rem] mx-auto">
      <div className="bg-[#0d1520] border border-white/15 rounded-[2.5rem] p-4 shadow-2xl">
        {/* Status bar */}
        <div className="flex justify-between items-center px-2 mb-4">
          <span className="text-[0.6rem] text-white/40">9:41</span>
          <div className="w-20 h-5 bg-black rounded-full" />
          <span className="text-[0.6rem] text-white/40">●●●</span>
        </div>
        {/* App content */}
        <div className="bg-[#0a1020] rounded-2xl p-4 text-white">
          <p className="text-[0.65rem] text-white/40">Total Assets ◉</p>
          <p className="text-2xl font-black mt-1">$250,730.50</p>
          <p className="text-xs text-green mt-0.5">+$4,275.20 (1.73%) Today</p>
          <MiniChart className="mt-3 h-14 w-full" color="#22c55e" />
          <div className="mt-3 grid grid-cols-2 gap-2">
            {[
              { l: "Checking", v: "$28,420" },
              { l: "Savings",  v: "$67,880" },
              { l: "Crypto",   v: "$34,250" },
              { l: "401(k)",   v: "$56,500" },
            ].map(i => (
              <div key={i.l} className="bg-white/6 rounded-xl p-2.5">
                <p className="text-[0.6rem] text-white/40">{i.l}</p>
                <p className="text-xs font-black mt-0.5">{i.v}</p>
              </div>
            ))}
          </div>
          <p className="text-[0.6rem] text-white/30 text-right mt-2">View all accounts →</p>
        </div>
      </div>
    </div>
  );
}

/* ── Card Mockup ─────────────────────────── */
export function CardMockup() {
  return (
    <div className="w-[18rem] mx-auto">
      <div className="premium-metal-card p-6 text-white h-48">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[0.6rem] font-bold tracking-[0.25em] text-white/50">GRAND CENTRAL</p>
            <p className="text-xs font-black">LIBERTY BANK</p>
          </div>
          <div className="flex items-center gap-0.5">
            <div className="size-7 rounded-full bg-amber-400/80" />
            <div className="size-7 rounded-full bg-amber-600/80 -ml-3" />
          </div>
        </div>
        <div className="mt-6">
          <p className="text-lg font-black tracking-widest text-white/70">•••• •••• •••• 4587</p>
        </div>
        <div className="mt-4 flex items-end justify-between">
          <div>
            <p className="text-[0.55rem] text-white/40 uppercase tracking-wider">Card Holder</p>
            <p className="text-xs font-bold">IDRIS MORGAN</p>
          </div>
          <span className="text-xs font-black bg-white/15 border border-white/20 px-3 py-1 rounded-full">
            VISA ∞
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── Trust Row ─────────────────────────── */
export function TrustRow() {
  return (
    <div className="flex flex-wrap gap-3">
      {[
        { label: "Licensed & Regulated in 15+ Countries", icon: ShieldCheck },
        { label: "Bank-Grade Security AES-256 Encryption", icon: LockKeyhole },
        { label: "$1B Protection FDIC & Lloyd's Covered",  icon: Banknote    },
      ].map((item) => (
        <div key={item.label} className="flex items-center gap-2 text-white/60 text-xs font-semibold">
          <item.icon className="size-3.5 text-green" />
          {item.label}
        </div>
      ))}
    </div>
  );
}

/* ── Product Showcase ─────────────────────── */
export function ProductShowcase() {
  const products = [
    { title: "Personal Banking", body: "Checking, savings, profile controls, notifications, and secure activity history.", icon: Landmark, href: "/register" },
    { title: "Business Banking", body: "Operational accounts, payment workflows, and admin-reviewed money movement.", icon: Building2, href: "/register" },
    { title: "Crypto Banking", body: "Deposit, receive, send, withdraw, and swap assets through managed wallet networks.", icon: Bitcoin, href: "/wallet" },
    { title: "International Transfers", body: "Domestic and cross-border transfer requests with compliance review and support routing.", icon: Globe2, href: "/transfers" },
    { title: "Multi-Currency Accounts", body: "Exchange-rate visibility and global account tools for clients who move across markets.", icon: RefreshCcw, href: "/accounts" },
    { title: "Virtual Cards", body: "Apply for cards, track status, and manage premium digital card services.", icon: WalletCards, href: "/cards" },
    { title: "Physical Cards", body: "Classic, Gold, Platinum, and Signature card applications with manual decisions.", icon: CreditCard, href: "/cards" },
    { title: "401(k) Retirement", body: "Retirement balance, contribution history, withdrawal review, and compliance documents.", icon: LineChart, href: "/retirement" },
    { title: "Wealth Management", body: "Net worth, asset allocation, investment growth, and private banking insights.", icon: TrendingUp, href: "/dashboard" },
    { title: "Savings", body: "Savings balances, transaction history, interest activity, and secure statements.", icon: PiggyBank, href: "/accounts" },
    { title: "Loans", body: "Personal finance guidance and support-assisted review for future lending products.", icon: Banknote, href: "/support" },
    { title: "Investments", body: "Portfolio growth widgets, projected retirement value, and market signal previews.", icon: TrendingUp, href: "/retirement" },
    { title: "Trading", body: "Crypto portfolio tools and conversion previews with manual review before release.", icon: ScanLine, href: "/wallet" },
    { title: "Mobile Banking", body: "Responsive mobile-first account access with bottom navigation and quick actions.", icon: Smartphone, href: "/dashboard" },
    { title: "Security", body: "2FA, secure sessions, CSRF protection, audit logs, and role-based admin controls.", icon: ShieldCheck, href: "/support" },
    { title: "AI Financial Assistant", body: "Smart alerts, market context, budget prompts, and portfolio suggestions.", icon: Search, href: "/support" },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {products.map((p) => (
        <Link key={p.title} href={p.href} className="group rounded-2xl border border-white/8 bg-white/5 p-5 transition hover:-translate-y-1 hover:border-emerald-300/25 hover:bg-white/8">
          <div className="size-10 rounded-xl bg-white/10 flex items-center justify-center mb-4 group-hover:bg-green/20 transition">
            <p.icon className="size-5 text-white/70 group-hover:text-green transition" />
          </div>
          <p className="font-black text-white text-sm">{p.title}</p>
          <p className="text-xs text-white/50 mt-1.5 leading-relaxed">{p.body}</p>
          <span className="mt-4 inline-flex items-center gap-1 text-xs font-black text-green/80">
            Explore <ArrowRight className="size-3" />
          </span>
        </Link>
      ))}
    </div>
  );
}

/* ── Feature Rail ─────────────────────────── */
export function FeatureRail() {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {[
        { title: "Market News",      body: "Tech stocks rise as AI optimism boosts global markets.", icon: TrendingUp },
        { title: "Interest Rates",   body: "Checking 0.50% APY · Savings 4.60% APY · CD 4.85%",    icon: LineChart  },
        { title: "Credit Score",     body: "Your score is 782 — Excellent. Updated May 20, 2026.",  icon: ShieldCheck},
      ].map((f) => (
        <div key={f.title} className="bg-white/5 border border-white/8 rounded-2xl p-5">
          <f.icon className="size-5 text-green mb-3" />
          <p className="font-black text-white text-sm">{f.title}</p>
          <p className="text-xs text-white/50 mt-1.5 leading-relaxed">{f.body}</p>
          <Link href="/register" className="inline-block text-xs font-bold text-green/80 mt-3 hover:text-green">Read more →</Link>
        </div>
      ))}
    </div>
  );
}

/* ── PageHeader (kept for compat) ─────────── */
export function PageHeader({
  title, description, action
}: {
  title: string; description: string; action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between fade-up">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight">{title}</h1>
        <p className="text-sm text-white/50 mt-1.5 max-w-xl leading-relaxed">{description}</p>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/* ── Premium Metal Card (dashboard sidebar) ─ */
export function PremiumMetalCard() {
  return (
    <div className="premium-metal-card p-5 text-white">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-[0.6rem] font-bold tracking-widest text-white/40">GRAND CENTRAL</p>
          <p className="text-[0.6rem] font-bold tracking-widest text-white/40">LIBERTY BANK</p>
        </div>
        <CreditCard className="size-5 text-white/30" />
      </div>
      <p className="text-base font-black">Premium Metal Card</p>
      <p className="text-xs text-white/50 mt-1">Elevate every experience.</p>
      <div className="mt-4 flex items-center gap-2">
        <span className="text-xs font-bold text-green cursor-pointer hover:text-green-dim transition">Learn more →</span>
      </div>
      {/* Card image on right */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 w-24 h-16 bg-gradient-to-br from-slate-700 to-slate-900 rounded-xl border border-white/10 opacity-60" />
    </div>
  );
}

/* ── Re-exports ─────────────────────────── */
export { ArrowRight, QrCode, WalletCards, RefreshCcw };
