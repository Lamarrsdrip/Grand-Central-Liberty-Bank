import Link from "next/link";
import {
  ArrowRight,
  Award,
  Building2,
  CheckCircle2,
  CreditCard,
  Globe2,
  LockKeyhole,
  Menu,
  Play,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users
} from "lucide-react";
import { CryptoIcon } from "@/components/banking/crypto-icons";
import {
  CardMockup,
  FeatureRail,
  MarketStrip,
  MiniChart,
  ProductShowcase,
  PublicPhoneMockup,
  TrustRow
} from "@/components/banking/premium-ui";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const proofStats = [
  { label: "Customers protected", value: "2.4M+" },
  { label: "Countries served", value: "42" },
  { label: "Annual volume", value: "$18.6B" },
  { label: "Fraud monitoring", value: "24/7" }
];

const trustItems = [
  { title: "AES-256 encryption", body: "Sensitive account activity is protected with bank-grade security controls.", icon: LockKeyhole },
  { title: "Compliance reviews", body: "KYC, transfers, cards, crypto, and retirement requests route through manual bank review.", icon: ShieldCheck },
  { title: "Global coverage", body: "International transfers, multi-currency accounts, and travel-ready cards for cross-border clients.", icon: Globe2 },
  { title: "Award-level support", body: "Live support tickets and admin-managed conversations stay connected to every account.", icon: Award }
];

const testimonials = [
  {
    quote: "The app gives our family office one place to view cash, cards, transfers, crypto, and retirement assets.",
    name: "Nadia K.",
    role: "Private banking client"
  },
  {
    quote: "International wires, compliance notes, and support responses are clear enough for our operations team.",
    name: "Marcus R.",
    role: "Business owner"
  },
  {
    quote: "The 401(k) and card workflows feel like a real bank, not a dashboard stitched together.",
    name: "Elena V.",
    role: "Wealth client"
  }
];

const complianceBadges = [
  { label: "SOC-style controls", icon: CheckCircle2 },
  { label: "FDIC and Lloyd's coverage references", icon: ShieldCheck },
  { label: "Fraud protection monitoring", icon: LockKeyhole },
  { label: "Banking partners and audits", icon: Users }
];

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-3">
      <div className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-emerald-300 to-teal-600 shadow-[0_18px_45px_rgba(34,197,94,0.25)]">
        <Building2 className="size-5 text-white" />
      </div>
      <div className="leading-tight">
        <p className="text-sm font-black tracking-wide">GRAND CENTRAL</p>
        <p className="text-[0.6rem] font-bold uppercase tracking-[0.26em] text-white/45">Liberty Bank</p>
      </div>
    </Link>
  );
}

function WorldTransferMap() {
  return (
    <div className="landing-world-card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-white/35">Global transfers</p>
          <p className="mt-1 text-lg font-black text-white">Live routing map</p>
        </div>
        <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-black text-emerald-200">Active</span>
      </div>
      <svg viewBox="0 0 520 210" className="mt-4 h-48 w-full" aria-hidden="true">
        <defs>
          <linearGradient id="route-glow" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#38bdf8" />
          </linearGradient>
        </defs>
        <path d="M52 92 C118 24 202 36 265 90 S396 174 472 72" fill="none" stroke="url(#route-glow)" strokeWidth="2.5" strokeDasharray="8 10" />
        <path d="M74 150 C146 110 204 128 252 96 S350 48 438 136" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeDasharray="4 8" />
        {[
          [52, 92], [168, 50], [265, 90], [386, 154], [472, 72], [74, 150], [438, 136]
        ].map(([cx, cy], index) => (
          <g key={`${cx}-${cy}`}>
            <circle cx={cx} cy={cy} r={index === 2 ? 9 : 6} fill={index === 2 ? "#22c55e" : "#ffffff"} opacity={index === 2 ? 1 : 0.78} />
            <circle cx={cx} cy={cy} r={index === 2 ? 18 : 13} fill="none" stroke="#22c55e" opacity=".18" />
          </g>
        ))}
        <g opacity=".28" stroke="white" strokeWidth="1">
          <path d="M88 70 135 55l38 22 50-10 34 26 46-18 58 28 58-24" />
          <path d="M96 126 156 118l42 18 58-22 42 19 58-12 70 18" />
        </g>
      </svg>
    </div>
  );
}

function BankingHeroVisual() {
  return (
    <div className="landing-visual-stage">
      <div className="absolute inset-0 rounded-[2rem] bg-[radial-gradient(circle_at_30%_20%,rgba(34,197,94,0.22),transparent_30%),radial-gradient(circle_at_90%_70%,rgba(59,130,246,0.2),transparent_34%)]" />
      <div className="absolute left-2 top-6 hidden w-60 rotate-[-8deg] lg:block">
        <CardMockup />
      </div>
      <div className="relative z-10 mx-auto w-fit translate-y-2">
        <PublicPhoneMockup />
      </div>
      <div className="landing-notification left-0 top-28">
        <span className="grid size-8 place-items-center rounded-full bg-emerald-400 text-xs font-black text-black">+$</span>
        <div>
          <p className="text-xs font-black text-white">Salary deposit posted</p>
          <p className="text-[0.65rem] text-white/45">$3,250.00 to Checking</p>
        </div>
      </div>
      <div className="landing-notification right-0 top-10">
        <CreditCard className="size-8 rounded-full bg-white/10 p-2 text-emerald-300" />
        <div>
          <p className="text-xs font-black text-white">Virtual card ready</p>
          <p className="text-[0.65rem] text-white/45">Travel rewards active</p>
        </div>
      </div>
      <div className="landing-portfolio-widget bottom-6 right-3">
        <p className="text-[0.65rem] font-black uppercase tracking-wider text-white/35">Portfolio</p>
        <p className="mt-1 text-lg font-black text-white">$250,730</p>
        <MiniChart className="mt-2 h-9 w-28" color="#22c55e" />
      </div>
      <div className="landing-asset-stack bottom-14 left-4">
        {["BTC", "ETH", "USDT", "SOL"].map((symbol) => (
          <CryptoIcon key={symbol} symbol={symbol} className="size-9 border border-white/15" />
        ))}
      </div>
    </div>
  );
}

export default async function HomePage() {
  const user = await getCurrentUser();
  const dashboardHref = user ? (user.role === "ADMIN" ? "/admin" : "/dashboard") : "/login";

  return (
    <main className="landing-dark text-white">
      <section className="landing-hero-bg relative overflow-hidden px-4 pb-10 sm:px-6 lg:px-10 lg:pb-16">
        <div className="pointer-events-none absolute inset-0 landing-grid-mask" />
        <div className="mx-auto max-w-7xl">
          <header className="relative z-20 flex items-center justify-between py-5">
            <Brand />
            <nav className="hidden items-center gap-8 text-sm font-semibold text-white/62 lg:flex">
              {["Banking", "Wealth", "Cards", "Crypto", "Security", "Support"].map((item) => (
                <a key={item} href={`#${item.toLowerCase()}`} className="transition hover:text-white">{item}</a>
              ))}
            </nav>
            <div className="flex items-center gap-2">
              <Link href="/login" className="hidden px-4 py-2 text-sm font-bold text-white/80 transition hover:text-white sm:block">Log in</Link>
              <Link href="/register" className="rounded-full bg-green px-5 py-2.5 text-sm font-black text-black transition hover:bg-green-dim">Open Account</Link>
              <Link href="/login" className="grid size-11 place-items-center rounded-full border border-white/10 bg-white/8 lg:hidden" aria-label="Open login">
                <Menu className="size-5" />
              </Link>
            </div>
          </header>

          <div className="relative z-10 grid gap-8 pt-8 lg:grid-cols-[minmax(0,0.96fr)_minmax(27rem,0.84fr)] lg:items-center lg:pt-14">
            <div className="fade-up">
              <div className="mb-6 flex flex-wrap gap-2 text-xs font-black text-white/58">
                <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-emerald-100">Private banking</span>
                <span className="rounded-full border border-white/10 bg-white/7 px-3 py-2">Crypto-ready</span>
                <span className="rounded-full border border-white/10 bg-white/7 px-3 py-2">401(k) retirement</span>
              </div>
              <h1 className="max-w-4xl text-5xl font-black leading-[0.92] tracking-tight sm:text-6xl lg:text-7xl">
                Global banking.
                <br />
                Limitless <span className="text-green">freedom.</span>
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-white/58">
                Bank, save, invest, transfer, trade, and plan retirement from one secure international financial platform.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/register" className="flex items-center gap-2 rounded-full bg-green px-6 py-3.5 font-black text-black transition hover:bg-green-dim">
                  Open Account <ArrowRight className="size-4" />
                </Link>
                <Link href={dashboardHref} className="flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-6 py-3.5 font-black text-white transition hover:bg-white/14">
                  <Play className="size-4" /> Explore Products
                </Link>
              </div>
              <div className="mt-8">
                <TrustRow />
              </div>
              <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {proofStats.map((stat) => (
                  <div key={stat.label} className="rounded-2xl border border-white/8 bg-white/6 p-4 backdrop-blur-xl">
                    <p className="stat-count text-2xl font-black text-white">{stat.value}</p>
                    <p className="mt-1 text-[0.68rem] font-bold uppercase tracking-wider text-white/38">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <BankingHeroVisual />
          </div>

          <div className="relative z-10 mt-8 grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-stretch">
            <div className="rounded-3xl border border-white/8 bg-white/5 px-5 py-3 backdrop-blur-xl">
              <MarketStrip />
            </div>
            <div className="rounded-3xl border border-white/8 bg-white/5 p-4 backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-white/35">AI assistant</p>
                <Sparkles className="size-4 text-emerald-300" />
              </div>
              <p className="mt-2 text-sm font-bold leading-5 text-white/70">&ldquo;Your USD/EUR exchange window improved 0.21% today.&rdquo;</p>
            </div>
          </div>
        </div>
      </section>

      <section id="banking" className="px-4 py-14 sm:px-6 lg:px-10 lg:py-18">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-4 lg:grid-cols-[0.75fr_1fr] lg:items-end">
            <div>
              <h2 className="text-3xl font-black sm:text-5xl">A complete financial platform.</h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/52">
                Personal banking, business payments, virtual cards, crypto, investments, transfers, and retirement tools are connected in one account experience.
              </p>
            </div>
            <FeatureRail />
          </div>
          <div className="mt-10">
            <ProductShowcase />
          </div>
        </div>
      </section>

      <section id="wealth" className="bg-[#080c14] px-4 py-14 sm:px-6 lg:px-10 lg:py-18">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <WorldTransferMap />
          <div className="grid gap-4">
            <div className="luxury-hero p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-white/35">Total assets</p>
                  <p className="mt-2 text-4xl font-black">$250,730.50</p>
                  <p className="mt-1 text-sm font-bold text-green">+$4,275.20 (1.73%) today</p>
                </div>
                <TrendingUp className="size-10 rounded-2xl bg-emerald-400/12 p-2.5 text-emerald-300" />
              </div>
              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
                {[
                  ["Checking", "$28.4K"],
                  ["Crypto", "$34.3K"],
                  ["401(k)", "$56.5K"],
                  ["Cards", "$14.0K"],
                  ["Invest", "$63.7K"]
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-white/8 bg-white/7 p-3">
                    <p className="text-[0.65rem] font-bold text-white/40">{label}</p>
                    <p className="mt-1 text-sm font-black">{value}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                ["Portfolio growth", "+8.4%", "401(k) and managed investments"],
                ["Cashback", "3.0%", "Premium card rewards"],
                ["FX savings", "$4,820", "Annual multi-currency benefit"]
              ].map(([label, value, body]) => (
                <div key={label} className="rounded-3xl border border-white/8 bg-white/5 p-5">
                  <p className="text-2xl font-black text-white">{value}</p>
                  <p className="mt-1 text-sm font-black text-white/80">{label}</p>
                  <p className="mt-2 text-xs leading-5 text-white/42">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="crypto" className="px-4 py-14 sm:px-6 lg:px-10 lg:py-18">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <h2 className="text-3xl font-black sm:text-5xl">Crypto banking with real controls.</h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-white/52">
              Deposit, receive, withdraw, send, and swap through bank-administered wallets with network selection, QR codes, copy address tools, and manual review.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {["Deposit", "Withdraw", "Swap", "Receive", "Send", "Compliance review"].map((label) => (
                <span key={label} className="rounded-full border border-white/10 bg-white/7 px-3.5 py-2 text-xs font-black text-white/68">{label}</span>
              ))}
            </div>
          </div>
          <div className="card-glass p-5">
            {[
              ["BTC", "Bitcoin", "$104,280", "+2.8%"],
              ["ETH", "Ethereum", "$5,830", "+1.4%"],
              ["USDT", "Tether", "$1.00", "0.0%"],
              ["SOL", "Solana", "$219", "+4.2%"]
            ].map(([symbol, name, price, change]) => (
              <div key={symbol} className="flex items-center gap-4 border-b border-white/5 py-4 last:border-0">
                <CryptoIcon symbol={symbol} className="size-11" />
                <div className="min-w-0 flex-1">
                  <p className="font-black text-white">{symbol}</p>
                  <p className="text-xs text-white/42">{name}</p>
                </div>
                <MiniChart className="hidden h-8 w-20 sm:block" color={symbol === "BTC" ? "#f59e0b" : "#22c55e"} />
                <div className="text-right">
                  <p className="text-sm font-black text-white">{price}</p>
                  <p className="text-xs font-black text-green">{change}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="security" className="bg-[#080c14] px-4 py-14 sm:px-6 lg:px-10 lg:py-18">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-start">
            <div>
              <h2 className="text-3xl font-black sm:text-5xl">Trust built into every workflow.</h2>
              <p className="mt-4 text-sm leading-7 text-white/52">
                Grand Central Liberty Bank combines customer controls, admin audit trails, compliance review, encryption, and live support into a single operating model.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {trustItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="rounded-3xl border border-white/8 bg-white/5 p-5">
                    <Icon className="size-6 text-green" />
                    <h3 className="mt-5 text-lg font-black">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-white/48">{item.body}</p>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {testimonials.map((item) => (
              <div key={item.name} className="rounded-3xl border border-white/8 bg-white/5 p-5">
                <p className="text-sm leading-7 text-white/68">&ldquo;{item.quote}&rdquo;</p>
                <div className="mt-5 flex items-center gap-3">
                  <div className="grid size-10 place-items-center rounded-full bg-emerald-400/15 text-sm font-black text-emerald-200">
                    {item.name.slice(0, 1)}
                  </div>
                  <div>
                    <p className="text-sm font-black">{item.name}</p>
                    <p className="text-xs text-white/38">{item.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {complianceBadges.map(({ label, icon: Icon }) => (
              <div key={label} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/5 p-4 text-sm font-black text-white/70">
                <Icon className="size-5 text-green" />
                {label}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 lg:px-10 lg:py-18">
        <div className="mx-auto max-w-5xl rounded-[2rem] border border-emerald-400/15 bg-[radial-gradient(circle_at_20%_20%,rgba(34,197,94,0.22),transparent_34%),linear-gradient(135deg,#101827,#07110d)] p-6 text-center shadow-2xl sm:p-10">
          <h2 className="text-3xl font-black sm:text-5xl">Ready for modern banking?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-white/58">
            Open an account in minutes, or sign in to access your full financial dashboard, cards, wallet, transfers, support, and retirement tools.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/register" className="rounded-full bg-green px-7 py-3.5 font-black text-black transition hover:bg-green-dim">Open account</Link>
            <Link href="/login" className="rounded-full border border-white/15 bg-white/8 px-7 py-3.5 font-black text-white transition hover:bg-white/14">Log in</Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/5 bg-[#060a10] px-4 py-10 sm:px-6 lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2 text-sm text-white/42">
            <ShieldCheck className="size-4 text-green" />
            Trusted by private clients, business operators, and global banking users.
          </div>
          <p className="text-xs text-white/30">24/7 Secure Support +1 (833) 452-7328</p>
        </div>
        <p className="mt-6 text-center text-xs text-white/20">© 2026 Grand Central Liberty Bank. Licensed and regulated banking technology platform.</p>
      </footer>
    </main>
  );
}
