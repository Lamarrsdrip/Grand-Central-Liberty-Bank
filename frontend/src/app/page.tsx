import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CreditCard,
  Headphones,
  Landmark,
  LockKeyhole,
  Menu,
  Send,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { CardMockup, PublicPhoneMockup } from "@/components/banking/premium-ui";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const capabilities = [
  { icon: Landmark, title: "Private banking", body: "Checking, savings and account activity presented in one refined workspace." },
  { icon: Send, title: "Global transfers", body: "Move money domestically and internationally with clear status and review workflows." },
  { icon: CreditCard, title: "Premium cards", body: "Manage physical and virtual cards, card limits and everyday controls." },
  { icon: WalletCards, title: "Digital assets", body: "View crypto balances, deposits, withdrawals and swaps beside traditional accounts." },
];

const security = [
  "Protected account access",
  "Identity and transaction review",
  "Encrypted financial data handling",
  "Connected support when you need it",
];

function GrandCentralMark({ dark = false }: { dark?: boolean }) {
  return (
    <Link href="/" className="inline-flex items-center gap-3" aria-label="Grand Central Liberty Bank home">
      <span className={`grid size-11 place-items-center rounded-[15px] ${dark ? "bg-[#d9b76b] text-[#07121f]" : "bg-[#0b1b2d] text-[#e7c77b]"} shadow-[0_14px_30px_rgba(11,27,45,.14)]`}>
        <Building2 className="size-5" />
      </span>
      <span className="leading-tight">
        <span className={`block text-[0.92rem] font-black tracking-[0.055em] ${dark ? "text-white" : "text-[#0b1b2d]"}`}>GRAND CENTRAL</span>
        <span className={`block text-[0.6rem] font-extrabold uppercase tracking-[0.24em] ${dark ? "text-white/45" : "text-[#8b7650]"}`}>Liberty Bank</span>
      </span>
    </Link>
  );
}

export default async function HomePage() {
  const user = await getCurrentUser();
  const dashboardHref = user ? (user.role === "ADMIN" ? "/admin" : "/dashboard") : "/login";

  return (
    <main className="min-h-screen bg-[#f7f4ed] text-[#0b1b2d]">
      <section className="relative overflow-hidden bg-[#f7f4ed]">
        <div className="pointer-events-none absolute right-[-11rem] top-[-13rem] size-[34rem] rounded-full bg-[#efe0b9] blur-3xl" />
        <div className="pointer-events-none absolute bottom-[-16rem] left-[-10rem] size-[30rem] rounded-full bg-[#dce7ea] blur-3xl" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
          <header className="relative z-20 flex items-center justify-between py-6">
            <GrandCentralMark />
            <nav className="hidden items-center gap-8 text-sm font-bold text-[#687487] lg:flex">
              <a href="#banking" className="transition hover:text-[#9a7731]">Banking</a>
              <a href="#wealth" className="transition hover:text-[#9a7731]">Wealth</a>
              <a href="#security" className="transition hover:text-[#9a7731]">Security</a>
              <a href="#support" className="transition hover:text-[#9a7731]">Support</a>
            </nav>
            <div className="flex items-center gap-2">
              <Link href="/login" className="hidden rounded-full px-4 py-2.5 text-sm font-extrabold text-[#334257] sm:block">Sign in</Link>
              <Link href="/register" className="rounded-full bg-[#0b1b2d] px-5 py-2.5 text-sm font-extrabold text-white shadow-[0_14px_35px_rgba(11,27,45,.18)] transition hover:-translate-y-0.5">Open account</Link>
              <Link href="/login" className="grid size-10 place-items-center rounded-full border border-[#ded9cc] bg-white lg:hidden" aria-label="Open menu"><Menu className="size-4" /></Link>
            </div>
          </header>

          <div className="relative z-10 grid gap-14 pb-20 pt-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:pb-28 lg:pt-20">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#e3dccb] bg-white/85 px-3.5 py-2 text-xs font-extrabold text-[#745f37] shadow-sm backdrop-blur">
                <Sparkles className="size-3.5 text-[#b28a3b]" /> Private banking, redesigned for modern life
              </div>
              <h1 className="max-w-2xl text-5xl font-black leading-[0.96] tracking-[-0.055em] text-[#0b1b2d] sm:text-6xl lg:text-[4.8rem]">
                Your finances, <span className="text-[#b28a3b]">beautifully connected.</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-[#69778b]">
                Manage everyday banking, global transfers, cards, digital assets and long-term wealth from one Grand Central Liberty Bank account.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/register" className="inline-flex items-center gap-2 rounded-full bg-[#b28a3b] px-6 py-3.5 font-extrabold text-white shadow-[0_18px_45px_rgba(178,138,59,.25)] transition hover:-translate-y-0.5">
                  Open an account <ArrowRight className="size-4" />
                </Link>
                <Link href={dashboardHref} className="inline-flex items-center gap-2 rounded-full border border-[#ded8ca] bg-white px-6 py-3.5 font-extrabold text-[#25354a] transition hover:bg-[#fffdf8]">
                  Explore banking
                </Link>
              </div>
              <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm font-bold text-[#718095]">
                <span className="inline-flex items-center gap-2"><BadgeCheck className="size-4 text-[#b28a3b]" /> Multi-currency access</span>
                <span className="inline-flex items-center gap-2"><ShieldCheck className="size-4 text-[#b28a3b]" /> Security controls</span>
                <span className="inline-flex items-center gap-2"><Headphones className="size-4 text-[#b28a3b]" /> Live support</span>
              </div>
            </div>

            <div className="relative min-h-[34rem]">
              <div className="absolute inset-x-0 top-8 h-[27rem] rounded-[3rem] bg-[#0b1b2d] shadow-[0_35px_90px_rgba(11,27,45,.2)]" />
              <div className="absolute inset-x-10 top-20 h-40 rounded-full bg-[#b28a3b]/20 blur-3xl" />
              <div className="absolute left-6 top-4 hidden w-64 -rotate-6 lg:block"><CardMockup /></div>
              <div className="absolute right-4 top-0 z-10"><PublicPhoneMockup /></div>

              <div className="absolute bottom-8 left-4 z-20 w-[18rem] rounded-[1.6rem] border border-white/50 bg-white/95 p-5 shadow-2xl backdrop-blur-xl sm:left-10">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-[.16em] text-[#8e99aa]">Total relationship</p>
                    <p className="mt-1 text-2xl font-black tracking-[-.03em] text-[#0b1b2d]">$248,930.60</p>
                  </div>
                  <span className="grid size-10 place-items-center rounded-full bg-[#f5ead1] text-[#a17c32]"><TrendingUp className="size-5" /></span>
                </div>
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#ece8df]"><div className="h-full w-[78%] rounded-full bg-[#b28a3b]" /></div>
                <p className="mt-3 text-xs font-bold text-[#718095]">Cash, cards, crypto and wealth together.</p>
              </div>

              <div className="absolute bottom-24 right-1 z-20 rounded-2xl border border-white/10 bg-[#b28a3b] px-4 py-3 text-white shadow-xl sm:right-6">
                <p className="text-[.65rem] font-bold uppercase tracking-[.14em] text-white/65">Transfer complete</p>
                <p className="mt-1 text-sm font-black">$12,500.00 ✓</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="banking" className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
          <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr]">
            <div>
              <p className="text-xs font-black uppercase tracking-[.2em] text-[#a17c32]">Banking without the noise</p>
              <h2 className="mt-4 text-4xl font-black tracking-[-.045em] text-[#0b1b2d] sm:text-5xl">Everything important, in one place.</h2>
              <p className="mt-5 max-w-lg text-base leading-7 text-[#6c7a8e]">Grand Central combines everyday money movement with premium cards, support, digital assets and long-term financial tools.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {capabilities.map(({ icon: Icon, title, body }) => (
                <div key={title} className="rounded-[1.7rem] border border-[#e7e3da] bg-[#fbfaf6] p-6 transition hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(25,39,58,.08)]">
                  <span className="grid size-11 place-items-center rounded-2xl bg-[#f3ead4] text-[#a17c32]"><Icon className="size-5" /></span>
                  <h3 className="mt-5 text-lg font-black text-[#0b1b2d]">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#718095]">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="wealth" className="bg-[#0b1b2d] py-24 text-white">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-10">
          <div>
            <p className="text-xs font-black uppercase tracking-[.2em] text-[#d7b86e]">A wider financial view</p>
            <h2 className="mt-4 text-4xl font-black tracking-[-.045em] sm:text-5xl">See more than a balance.</h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-white/55">Move between accounts, cards, international payments, digital assets and retirement tools without leaving the Grand Central experience.</p>
            <Link href="/register" className="mt-8 inline-flex items-center gap-2 font-extrabold text-[#e1c786]">Create your Grand Central profile <ArrowRight className="size-4" /></Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {[["Accounts", "$92,420"], ["Cards", "4 active"], ["Digital assets", "$31,610"], ["Retirement", "$168,800"]].map(([label, value], i) => (
              <div key={label} className={`rounded-[1.8rem] border border-white/10 p-6 ${i === 0 ? "col-span-2 bg-[#b28a3b]" : "bg-white/[.055]"}`}>
                <p className="text-xs font-bold uppercase tracking-[.16em] text-white/45">{label}</p>
                <p className="mt-3 text-2xl font-black">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="security" className="bg-[#eee9df] py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
          <div className="rounded-[2.2rem] bg-white p-7 shadow-[0_30px_80px_rgba(33,45,60,.08)] sm:p-10 lg:p-14">
            <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
              <div>
                <span className="grid size-12 place-items-center rounded-2xl bg-[#0b1b2d] text-[#e1c786]"><LockKeyhole className="size-5" /></span>
                <h2 className="mt-6 text-4xl font-black tracking-[-.04em]">Security belongs in every interaction.</h2>
                <p className="mt-4 text-[#6d7b8f]">Grand Central combines account access controls, transaction review, secure data handling and connected support workflows throughout the platform.</p>
              </div>
              <div className="grid gap-3">
                {security.map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-2xl border border-[#e7e3da] p-4 font-bold text-[#344359]">
                    <ShieldCheck className="size-5 text-[#b28a3b]" />{item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="support" className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
          <div className="flex flex-col items-start justify-between gap-8 rounded-[2.2rem] bg-[#b28a3b] p-8 text-white shadow-[0_30px_80px_rgba(178,138,59,.2)] sm:p-12 lg:flex-row lg:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[.2em] text-white/60">Become a client</p>
              <h2 className="mt-3 text-3xl font-black tracking-[-.04em] sm:text-4xl">Your financial life deserves one clear home.</h2>
              <p className="mt-3 max-w-2xl text-white/75">Open your Grand Central Liberty Bank account and access the complete banking workspace.</p>
            </div>
            <Link href="/register" className="shrink-0 rounded-full bg-white px-6 py-3.5 font-black text-[#8f6b28]">Open an account</Link>
          </div>
        </div>
      </section>

      <footer className="bg-[#0b1b2d] py-10 text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-10">
          <GrandCentralMark dark />
          <div className="flex flex-wrap gap-5 text-xs font-bold text-white/45">
            <Link href="/login">Sign in</Link>
            <Link href="/register">Create account</Link>
            <Link href="/support">Support</Link>
          </div>
          <p className="text-xs text-white/35">© 2026 Grand Central Liberty Bank. Digital banking platform.</p>
        </div>
      </footer>
    </main>
  );
}
