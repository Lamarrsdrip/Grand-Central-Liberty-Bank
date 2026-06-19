import Link from "next/link";
import {
  BadgeDollarSign, Bell, Bitcoin, Building2, CreditCard,
  Headphones, Home, Landmark, LineChart,
  Search, Send, Settings2, ShieldCheck,
  UserCircle, WalletCards, ArrowLeftRight, MoreHorizontal
} from "lucide-react";
import { Role } from "@prisma/client";
import { LogoutButton } from "@/components/layout/logout-button";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { TranslationProvider } from "@/components/layout/translation-provider";
import { getServerTranslations } from "@/lib/i18n/server-locale";
import { initials } from "@/lib/utils";

type User = {
  id: string; firstName: string; lastName: string;
  email: string; role: Role;
  preferredLocale: string; preferredCurrency: string; themePreference: string;
};

const adminNav = [
  { href: "/admin?tab=overview",   label: "Dashboard", icon: Home          },
  { href: "/admin?tab=users",      label: "Users",     icon: UserCircle    },
  { href: "/admin?tab=accounts",   label: "Accounts",  icon: Landmark      },
  { href: "/admin?tab=kyc",        label: "KYC",       icon: ShieldCheck   },
  { href: "/admin?tab=wallets",    label: "Wallets",   icon: WalletCards   },
  { href: "/admin?tab=retirement", label: "401(k)",    icon: LineChart     },
  { href: "/admin?tab=transfers",  label: "Transfers", icon: BadgeDollarSign},
  { href: "/admin?tab=cards",      label: "Cards",     icon: CreditCard    },
  { href: "/admin?tab=support",    label: "Support",   icon: Headphones    },
  { href: "/admin?tab=settings",   label: "Settings",  icon: Settings2     },
] as const;


export function AppShell({
  user, announcements, children
}: {
  user: User;
  announcements: Array<{ id: string; title: string; body: string; tone: string; href: string | null }>;
  children: React.ReactNode;
}) {
  const { tx } = getServerTranslations(user.preferredLocale);

  const userNav = [
    { href: "/dashboard",  label: tx.nav_home,          icon: Home          },
    { href: "/accounts",   label: tx.nav_accounts,      icon: Landmark      },
    { href: "/wallet",     label: tx.nav_wallet,        icon: WalletCards   },
    { href: "/transfers",  label: tx.nav_payments,      icon: Send          },
    { href: "/cards",      label: tx.nav_cards,         icon: CreditCard    },
    { href: "/retirement", label: tx.nav_invest,        icon: LineChart     },
    { href: "/crypto",     label: tx.nav_crypto,        icon: Bitcoin       },
    { href: "/profile",    label: tx.nav_profile,       icon: UserCircle    },
    { href: "/support",    label: tx.nav_support,       icon: Headphones    },
  ];
  const nav = user.role === "ADMIN" ? adminNav : userNav;

  return (
    <TranslationProvider initialLocale={user.preferredLocale}>
    <div className="app-bg min-h-screen flex">
      {/* ── Desktop Sidebar ───────────────────── */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-[15.5rem] flex-col sidebar-glass z-30">
        {/* Brand */}
        <div className="p-5 border-b border-white/6">
          <Link href={user.role === "ADMIN" ? "/admin" : "/dashboard"} className="flex items-center gap-3">
            <div className="size-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg">
              <Building2 className="size-5 text-white" />
            </div>
            <div>
              <p className="text-xs font-black text-white tracking-wide">GRAND CENTRAL</p>
              <p className="text-[0.6rem] font-bold text-white/30 tracking-[0.22em] uppercase">Liberty Bank</p>
            </div>
          </Link>
        </div>

        {/* User card */}
        <div className="px-4 py-4 border-b border-white/6">
          <div className="flex items-center gap-3 bg-white/5 rounded-2xl p-3">
            <div className="size-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-sm font-black text-white">
              {initials(user.firstName, user.lastName)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-black text-white truncate">{user.firstName} {user.lastName}</p>
              <p className="text-[0.65rem] text-white/35 font-semibold">
                {user.role === "ADMIN" ? "Command Center" : "Private Client"}
              </p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-white/50 hover:text-white hover:bg-white/8 transition-all group"
              >
                <Icon className="size-4 shrink-0 group-hover:text-green transition-colors" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-white/6">
          <div className="text-xs font-bold text-white/25 uppercase tracking-wider mb-3 px-2">
            {user.role === "ADMIN" ? "Admin Panel" : "Personal Banking"}
          </div>
          <LogoutButton />
        </div>
      </aside>

      {/* ── Main content ─────────────────────── */}
      <div className="flex-1 min-w-0 lg:pl-[15.5rem] flex flex-col min-h-screen">
        {/* Desktop top bar */}
        <header className="hidden lg:flex sticky top-0 z-20 items-center justify-between px-8 py-4 bg-[#0b0f18]/90 backdrop-blur-xl border-b border-white/5">
          <div>
            <p className="text-xs text-white/30 font-semibold">{tx.dash_welcome}</p>
            <p className="text-lg font-black text-white">{user.firstName} {user.lastName}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-36">
              <LocaleSwitcher value={user.preferredLocale} />
            </div>
            <Link href="/support" className="size-9 flex items-center justify-center rounded-full bg-white/6 border border-white/8 text-white/50 hover:text-white transition" aria-label="Search support">
              <Search className="size-4" />
            </Link>
            <Link href="/notifications" className="relative size-9 flex items-center justify-center rounded-full bg-white/6 border border-white/8 text-white/50 hover:text-white transition" aria-label="Notifications">
              <Bell className="size-4" />
              {announcements.length > 0 ? (
                <span className="absolute -top-0.5 -right-0.5 size-4 flex items-center justify-center rounded-full bg-red-500 text-[0.6rem] font-black text-white">{announcements.length}</span>
              ) : null}
            </Link>
          </div>
        </header>

        {/* Announcements */}
        {announcements.slice(0,1).map((a) => (
          <div key={a.id} className="mx-4 mt-4 lg:mx-8 flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl px-5 py-3.5">
            <div className="size-7 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
              <ShieldCheck className="size-3.5 text-green" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white">{a.title}</p>
              <p className="text-xs text-white/50 mt-0.5 truncate">{a.body}</p>
            </div>
            {a.href && (
              <Link href={a.href} className="text-xs font-bold text-green shrink-0 hover:text-green-dim transition">Open</Link>
            )}
          </div>
        ))}

        {/* Page content */}
        <main className="flex-1 min-w-0 w-full px-4 sm:px-5 lg:px-8 pb-28 lg:pb-8 pt-5 overflow-x-hidden">
          {children}
        </main>
      </div>

      {/* ── Mobile bottom nav ─────────────────── */}
      {user.role !== "ADMIN" && (
        <nav className="bottom-nav lg:hidden">
          {[
            { href: "/dashboard", label: tx.nav_home,     icon: Home       },
            { href: "/accounts",  label: tx.nav_accounts, icon: Landmark   },
            { href: "/transfers", label: "",               icon: ArrowLeftRight, center: true },
            { href: "/wallet",    label: tx.nav_wallet,   icon: WalletCards },
            { href: "/more",      label: tx.nav_more,     icon: MoreHorizontal },
          ].map((item) => {
            const Icon = item.icon;
            if (item.center) {
              return (
                <Link key={item.href} href={item.href} className="flex flex-col items-center justify-center -mt-4" aria-label="Transfer">
                  <div className="bottom-nav-center">
                    <Icon className="size-5 text-white" />
                  </div>
                </Link>
              );
            }
            return (
              <Link key={item.href} href={item.href} className="bottom-nav-item">
                <Icon className="size-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      )}
    </div>
    </TranslationProvider>
  );
}
