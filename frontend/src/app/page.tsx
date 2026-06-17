import Link from "next/link";
import { ArrowRight, Menu, Play, ShieldCheck, LockKeyhole, Banknote } from "lucide-react";
import {
  CardMockup, FeatureRail, MarketStrip, ProductShowcase,
  PublicPhoneMockup, TrustRow
} from "@/components/banking/premium-ui";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getCurrentUser();
  const dashboardHref = user ? (user.role === "ADMIN" ? "/admin" : "/dashboard") : "/login";

  return (
    <main className="landing-dark text-white">
      {/* ── Hero ───────────────────────────── */}
      <section className="landing-hero-bg relative px-4 sm:px-6 lg:px-10 pb-16">
        <div className="mx-auto max-w-7xl">
          {/* Nav */}
          <header className="flex items-center justify-between py-5">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg">
                <span className="text-white font-black text-lg">G</span>
              </div>
              <div>
                <p className="text-sm font-black tracking-wide">GRAND CENTRAL</p>
                <p className="text-[0.6rem] font-bold text-white/40 tracking-[0.22em] uppercase">Liberty Bank</p>
              </div>
            </div>
            <nav className="hidden lg:flex items-center gap-8 text-sm font-semibold text-white/60">
              {["Banking","Wealth","Cards","Crypto","Learn","About Us","Support"].map(item => (
                <a key={item} href={`#${item.toLowerCase().replace(/\s/g,"")}`} className="hover:text-white transition">{item}</a>
              ))}
            </nav>
            <div className="flex items-center gap-2">
              <Link href="/login" className="hidden sm:block text-sm font-bold text-white/80 hover:text-white px-4 py-2 transition">Log in</Link>
              <Link href="/register" className="text-sm font-bold bg-green text-black px-5 py-2.5 rounded-full hover:bg-green-dim transition">Open Account</Link>
              <Link href="/login" className="lg:hidden size-10 flex items-center justify-center rounded-full bg-white/8 border border-white/10" aria-label="Open login">
                <Menu className="size-5" />
              </Link>
            </div>
          </header>

          {/* Hero content */}
          <div className="grid lg:grid-cols-[1fr_auto] gap-12 items-center pt-12 lg:pt-20">
            <div className="max-w-2xl fade-up">
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-[0.95] tracking-tight">
                Global banking.<br/>
                <span className="text-white/90">Limitless </span>
                <span className="text-green">freedom.</span>
              </h1>
              <p className="mt-6 text-lg text-white/50 leading-relaxed max-w-lg">
                Bank, save, invest, and grow — all in one secure app designed for your world.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/register" className="flex items-center gap-2 bg-green text-black font-bold px-6 py-3.5 rounded-full hover:bg-green-dim transition">
                  Open Account <ArrowRight className="size-4" />
                </Link>
                <Link href={dashboardHref} className="flex items-center gap-2 bg-white/8 border border-white/15 text-white font-bold px-6 py-3.5 rounded-full hover:bg-white/14 transition">
                  <Play className="size-4" /> Explore Products
                </Link>
              </div>
              <div className="mt-10">
                <TrustRow />
              </div>
            </div>

            {/* Card + Phone mockup */}
            <div className="relative hidden lg:block w-[30rem] h-[34rem] hero-card-glow">
              <div className="absolute right-0 top-0 z-10">
                <PublicPhoneMockup />
              </div>
              <div className="absolute left-0 bottom-8 -rotate-6 z-0">
                <CardMockup />
              </div>
            </div>
          </div>

          {/* Mobile mockups */}
          <div className="lg:hidden mt-12 flex flex-col items-center gap-8">
            <PublicPhoneMockup />
          </div>

          {/* Exchange rates */}
          <div className="mt-12 lg:mt-16 bg-white/5 border border-white/8 rounded-2xl px-5 py-3">
            <MarketStrip />
          </div>
        </div>
      </section>

      {/* ── Products ───────────────────────── */}
      <section id="banking" className="px-4 sm:px-6 lg:px-10 py-16 bg-[#0a0e16]">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-3xl sm:text-4xl font-black mb-2">Everything you need. All in one place.</h2>
          <p className="text-white/40 mb-10">Checking, savings, cards, crypto, transfers, retirement, and support in one connected platform.</p>
          <ProductShowcase />
        </div>
      </section>

      {/* ── Wealth dashboard ───────────────── */}
      <section id="wealth" className="px-4 sm:px-6 lg:px-10 py-16 bg-[#080c14]">
        <div className="mx-auto max-w-7xl grid lg:grid-cols-2 gap-8 items-center">
          <div>
            <h2 className="text-3xl sm:text-4xl font-black mb-4">One view of your entire wealth.</h2>
            <p className="text-white/50 leading-relaxed mb-6">
              Checking, savings, crypto, 401(k), and investments roll up into a single net-worth dashboard — with live charts, insights, and smart alerts.
            </p>
            <FeatureRail />
          </div>
          <div className="luxury-hero p-6">
            <p className="text-xs text-white/40 font-semibold uppercase tracking-wider">Total Assets</p>
            <p className="text-4xl font-black mt-2">$250,730.50</p>
            <p className="text-sm text-green mt-1">+$4,275.20 (1.73%) Today</p>
            <div className="mt-6 grid grid-cols-5 gap-2">
              {[["Checking","$28.4K"],["Savings","$67.9K"],["Crypto","$34.3K"],["401(k)","$56.5K"],["Invest","$63.7K"]].map(([l,v]) => (
                <div key={l} className="bg-white/6 rounded-xl p-2.5 text-center">
                  <p className="text-[0.6rem] text-white/40">{l}</p>
                  <p className="text-xs font-black mt-1">{v}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Crypto ─────────────────────────── */}
      <section id="crypto" className="px-4 sm:px-6 lg:px-10 py-16 bg-[#0a0e16]">
        <div className="mx-auto max-w-7xl grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="text-3xl sm:text-4xl font-black mb-4">Exchange-grade crypto, bank-grade security.</h2>
            <p className="text-white/50 leading-relaxed mb-6">
              Buy, sell, swap, and hold 200+ assets. Deposit and withdraw with QR codes, network selection, and live portfolio tracking.
            </p>
            <div className="flex flex-wrap gap-2">
              {["Deposit","Withdraw","Swap","Send","Receive","Copy Address"].map(t => (
                <span key={t} className="text-xs font-bold bg-white/6 border border-white/10 px-3.5 py-2 rounded-full text-white/70">{t}</span>
              ))}
            </div>
          </div>
          <div className="card-glass p-5">
            {[["BTC","Bitcoin","$104,280","+2.8%","#f59e0b"],["ETH","Ethereum","$5,830","+1.4%","#6366f1"],["USDT","Tether","$1.00","0.0%","#10b981"],["SOL","Solana","$219","+4.2%","#8b5cf6"]].map(([s,n,p,c,col]) => (
              <div key={s} className="flex items-center gap-3 py-3.5 border-b border-white/5 last:border-0">
                <div className="size-10 rounded-full flex items-center justify-center font-black text-black text-sm" style={{background:col}}>{s[0]}</div>
                <div className="flex-1">
                  <p className="font-black text-sm">{s}</p>
                  <p className="text-xs text-white/40">{n}</p>
                </div>
                <div className="text-right">
                  <p className="font-black text-sm">{p}</p>
                  <p className="text-xs text-green">{c}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────── */}
      <section className="px-4 sm:px-6 lg:px-10 py-16 bg-[#080c14]">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl sm:text-5xl font-black mb-4">Ready for modern banking?</h2>
          <p className="text-white/50 mb-8 max-w-xl mx-auto">Open an account in minutes, or sign in to access your full financial dashboard.</p>
          <div className="flex justify-center gap-3">
            <Link href="/register" className="bg-green text-black font-bold px-7 py-3.5 rounded-full hover:bg-green-dim transition">Open account</Link>
            <Link href="/login" className="bg-white/8 border border-white/15 text-white font-bold px-7 py-3.5 rounded-full hover:bg-white/14 transition">Log in</Link>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────── */}
      <footer className="px-4 sm:px-6 lg:px-10 py-10 bg-[#060a10] border-t border-white/5">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-white/40 text-sm">
            <ShieldCheck className="size-4 text-green" />
            Trusted by millions worldwide · Forbes · Bloomberg · CNBC · Reuters
          </div>
          <p className="text-xs text-white/30">24/7 Secure Support +1 (833) 452-7328</p>
        </div>
        <p className="text-center text-xs text-white/20 mt-6">© 2026 Grand Central Liberty Bank. Licensed & Regulated. Member FDIC.</p>
      </footer>
    </main>
  );
}
