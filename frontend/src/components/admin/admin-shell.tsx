"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BadgeDollarSign, Bell, Bitcoin, Building2, ChevronLeft, ChevronRight, CreditCard,
  FileText, Headphones, Home, Landmark, LineChart, Mail, Menu, Settings2, ShieldCheck,
  UserCircle, Users, WalletCards, X
} from "lucide-react";
import { LogoutButton } from "@/components/layout/logout-button";
import { initials } from "@/lib/utils";

const navigation = [
  { tab: "overview", label: "Dashboard", icon: Home },
  { tab: "users", label: "Users", icon: Users },
  { tab: "accounts", label: "Accounts", icon: Landmark },
  { tab: "kyc", label: "KYC", icon: ShieldCheck },
  { tab: "crypto-balances", label: "Crypto balances", icon: Bitcoin },
  { tab: "crypto-withdrawals", label: "Crypto withdrawals", icon: BadgeDollarSign },
  { tab: "wallets", label: "Wallets", icon: WalletCards },
  { tab: "retirement", label: "401(k)", icon: LineChart },
  { tab: "transfers", label: "Transfers", icon: BadgeDollarSign },
  { tab: "beneficiaries", label: "Beneficiaries", icon: UserCircle },
  { tab: "cards", label: "Cards", icon: CreditCard },
  { tab: "support", label: "Live chat", icon: Headphones },
  { tab: "notifications", label: "Notifications", icon: Bell },
  { tab: "email", label: "Mail delivery", icon: Mail },
  { tab: "settings", label: "Settings", icon: Settings2 },
  { tab: "audit", label: "Audit logs", icon: FileText }
] as const;

type AdminUser = { firstName: string; lastName: string; email: string };

export function ResponsiveSidebar({ user, collapsed, open, onClose, onCollapse }: {
  user: AdminUser; collapsed: boolean; open: boolean; onClose: () => void; onCollapse: () => void;
}) {
  const activeTab = useSearchParams().get("tab") ?? "overview";
  return (
    <>
      {open ? <button aria-label="Close navigation" className="admin-drawer-backdrop" onClick={onClose} /> : null}
      <aside className="admin-sidebar" data-collapsed={collapsed} data-open={open}>
        <div className="admin-sidebar-brand">
          <Link href="/admin?tab=overview" className="flex min-w-0 items-center gap-3" onClick={onClose}>
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 shadow-lg"><Building2 className="size-4.5 text-white" /></span>
            <span className="admin-sidebar-copy min-w-0"><strong className="block truncate text-xs text-white">GRAND CENTRAL</strong><span className="block truncate text-[0.6rem] font-bold uppercase tracking-[.18em] text-white/35">Command Center</span></span>
          </Link>
          <button onClick={onClose} className="admin-mobile-close" aria-label="Close navigation"><X className="size-5" /></button>
        </div>
        <div className="admin-profile">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-amber-500 text-xs font-black text-white">{initials(user.firstName, user.lastName)}</span>
          <span className="admin-sidebar-copy min-w-0"><strong className="block truncate text-sm text-white">{user.firstName} {user.lastName}</strong><span className="block truncate text-[0.65rem] text-emerald-300/70">Administrator</span></span>
        </div>
        <nav className="admin-sidebar-nav" aria-label="Admin sections">
          {navigation.map(({ tab, label, icon: Icon }) => (
            <Link key={tab} href={`/admin?tab=${tab}`} onClick={onClose} title={collapsed ? label : undefined} aria-current={activeTab === tab ? "page" : undefined} className="admin-nav-link">
              <Icon className="size-4 shrink-0" /><span className="admin-sidebar-copy truncate">{label}</span>
            </Link>
          ))}
        </nav>
        <div className="admin-sidebar-footer">
          <LogoutButton />
          <button className="admin-collapse-button" onClick={onCollapse} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
            {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}<span className="admin-sidebar-copy">Collapse</span>
          </button>
        </div>
      </aside>
    </>
  );
}

export function AdminHeader({ user, onMenu }: { user: AdminUser; onMenu: () => void }) {
  return (
    <header className="admin-header">
      <button onClick={onMenu} className="admin-menu-button" aria-label="Open navigation"><Menu className="size-5" /></button>
      <div className="min-w-0"><p className="truncate text-sm font-black text-white">Operations Command Center</p><p className="hidden truncate text-xs text-white/35 sm:block">Secure administration · {user.email}</p></div>
      <div className="ml-auto flex items-center gap-2"><span className="hidden rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[0.65rem] font-bold text-emerald-200 sm:inline-flex">Production controls</span><Link href="/notifications" className="grid size-9 place-items-center rounded-xl border border-white/10 bg-white/5 text-white/60" aria-label="Notifications"><Bell className="size-4" /></Link></div>
    </header>
  );
}

export function AdminShell({ user, announcements, children }: {
  user: AdminUser; announcements: Array<{ id: string; title: string; body: string; href: string | null }>; children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  useEffect(() => setCollapsed(localStorage.getItem("gclb-admin-sidebar") === "collapsed"), []);
  const toggleCollapse = () => setCollapsed((value) => {
    const next = !value;
    localStorage.setItem("gclb-admin-sidebar", next ? "collapsed" : "expanded");
    return next;
  });
  return (
    <div className="admin-shell" data-collapsed={collapsed}>
      <ResponsiveSidebar user={user} collapsed={collapsed} open={drawerOpen} onClose={() => setDrawerOpen(false)} onCollapse={toggleCollapse} />
      <div className="admin-workspace">
        <AdminHeader user={user} onMenu={() => setDrawerOpen(true)} />
        {announcements.slice(0, 1).map((announcement) => <div key={announcement.id} className="admin-announcement"><ShieldCheck className="size-4 shrink-0 text-emerald-300" /><div className="min-w-0"><strong className="block truncate text-sm text-white">{announcement.title}</strong><p className="truncate text-xs text-white/45">{announcement.body}</p></div>{announcement.href ? <Link href={announcement.href} className="ml-auto shrink-0 text-xs font-bold text-emerald-300">Open</Link> : null}</div>)}
        <main className="admin-content">{children}</main>
      </div>
    </div>
  );
}
