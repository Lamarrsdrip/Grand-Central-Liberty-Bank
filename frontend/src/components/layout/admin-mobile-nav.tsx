"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Building2, Menu, X,
  Home, UserCircle, Landmark, ShieldCheck, Bitcoin,
  WalletCards, LineChart, BadgeDollarSign, CreditCard,
  Headphones, Settings2, Bell, FileText, LogOut
} from "lucide-react";
import { secureFetch } from "@/lib/client-api";
import { useRouter } from "next/navigation";

const adminNav = [
  { href: "/admin?tab=overview",        label: "Dashboard",    icon: Home           },
  { href: "/admin?tab=users",           label: "Users",        icon: UserCircle     },
  { href: "/admin?tab=accounts",        label: "Accounts",     icon: Landmark       },
  { href: "/admin?tab=kyc",             label: "KYC",          icon: ShieldCheck    },
  { href: "/admin?tab=crypto-balances", label: "Crypto Bal.",  icon: Bitcoin        },
  { href: "/admin?tab=wallets",         label: "Wallets",      icon: WalletCards    },
  { href: "/admin?tab=retirement",      label: "401(k)",       icon: LineChart      },
  { href: "/admin?tab=transfers",       label: "Transfers",    icon: BadgeDollarSign},
  { href: "/admin?tab=cards",           label: "Cards",        icon: CreditCard     },
  { href: "/admin?tab=support",         label: "Live Chat",    icon: Headphones     },
  { href: "/admin?tab=notifications",   label: "Notifications",icon: Bell           },
  { href: "/admin?tab=audit",           label: "Audit Logs",   icon: FileText       },
  { href: "/admin?tab=settings",        label: "Settings",     icon: Settings2      },
];

export function AdminMobileNav({ userName }: { userName: string }) {
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const router = useRouter();

  async function handleLogout() {
    setLoggingOut(true);
    await secureFetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      {/* Fixed top bar — mobile only */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3"
        style={{
          background: "rgba(11,15,24,0.97)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          backdropFilter: "blur(20px)",
        }}>
        <Link href="/admin" className="flex items-center gap-2.5">
          <div className="size-8 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg">
            <Building2 className="size-4 text-white" />
          </div>
          <div>
            <p className="text-[0.65rem] font-black text-white tracking-wide leading-none">GRAND CENTRAL</p>
            <p className="text-[0.5rem] font-bold text-white/30 tracking-[0.18em] uppercase">Command Center</p>
          </div>
        </Link>
        <button
          onClick={() => setOpen((o) => !o)}
          className="size-8 flex items-center justify-center rounded-xl transition text-white/50 hover:text-white hover:bg-white/8"
          aria-label="Toggle navigation"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {/* Backdrop */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-40"
          style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
          onClick={() => setOpen(false)}
        />
      )}

      {/* Slide-out drawer */}
      <div
        className="lg:hidden fixed top-0 left-0 h-full z-50 w-72 flex flex-col sidebar-glass transition-transform duration-300"
        style={{ transform: open ? "translateX(0)" : "translateX(-100%)" }}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <Link href="/admin" onClick={() => setOpen(false)} className="flex items-center gap-3">
            <div className="size-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg">
              <Building2 className="size-5 text-white" />
            </div>
            <div>
              <p className="text-xs font-black text-white tracking-wide">GRAND CENTRAL</p>
              <p className="text-[0.58rem] font-bold text-white/30 tracking-[0.2em] uppercase">Command Center</p>
            </div>
          </Link>
          <button onClick={() => setOpen(false)} className="text-white/30 hover:text-white transition p-1">
            <X className="size-5" />
          </button>
        </div>

        {/* User card */}
        <div className="px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
          <div className="flex items-center gap-3 rounded-2xl p-3" style={{ background: "rgba(255,255,255,0.04)" }}>
            <div className="size-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-xs font-black text-white flex-shrink-0">
              {userName.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-black text-white truncate">{userName}</p>
              <p className="text-[0.6rem] text-emerald-400/70 font-semibold">Administrator</p>
            </div>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
          {adminNav.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-white/50 hover:text-white hover:bg-white/8 transition-all group"
              >
                <Icon className="size-4 shrink-0 group-hover:text-emerald-400 transition-colors" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-red-400/70 hover:text-red-400 hover:bg-red-500/8 transition-all"
          >
            <LogOut className="size-4" />
            {loggingOut ? "Signing out…" : "Log out"}
          </button>
        </div>
      </div>
    </>
  );
}
