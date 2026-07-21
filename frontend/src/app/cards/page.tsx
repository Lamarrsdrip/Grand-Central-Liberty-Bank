import { redirect } from "next/navigation";
import Link from "next/link";
import { Snowflake, Settings2, Eye, Plus, CreditCard } from "lucide-react";
import { ProtectedShell } from "@/components/layout/protected-shell";
import { CardApplicationForm } from "@/components/banking/workflow-forms";
import { getCurrentUser } from "@/lib/auth";
import { getUserDashboardData } from "@/lib/data";

export const dynamic = "force-dynamic";

const cards = [
  { name: "Liberty Signature", type: "Credit · Metal", last4: "4587", grad: "from-slate-800 via-slate-900 to-black", limit: "$25,000", available: "$18,750" },
  { name: "Everyday Debit",    type: "Debit · Visa",   last4: "1234", grad: "from-emerald-900 via-teal-900 to-slate-900", limit: "—", available: "$28,420" },
];

export default async function CardsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  await getUserDashboardData(user.id);

  return (
    <ProtectedShell>
      <div className="max-w-3xl mx-auto space-y-5 fade-up">
        <div>
          <h1 className="text-3xl font-black text-white">Cards</h1>
          <p className="text-sm text-white/50 mt-1">Manage your physical and virtual cards.</p>
        </div>

        {/* Card carousel */}
        <div className="flex gap-4 overflow-x-auto scrollbar-none pb-2">
          {cards.map((c) => (
            <div key={c.last4} className={`shrink-0 w-80 bg-gradient-to-br ${c.grad} rounded-2xl p-6 border border-white/10 premium-metal-card`}>
              <div className="flex items-center justify-between mb-8">
                <div>
                  <p className="text-[0.6rem] font-bold tracking-widest text-white/40">GRAND CENTRAL LIBERTY BANK</p>
                </div>
                <div className="flex items-center gap-0.5">
                  <div className="size-6 rounded-full bg-amber-400/70" />
                  <div className="size-6 rounded-full bg-amber-600/70 -ml-2.5" />
                </div>
              </div>
              <p className="text-lg font-black tracking-[0.2em] text-white/80">•••• •••• •••• {c.last4}</p>
              <div className="mt-5 flex items-end justify-between">
                <div>
                  <p className="text-[0.55rem] text-white/40 uppercase">{c.name}</p>
                  <p className="text-xs font-bold text-white/70">{c.type}</p>
                </div>
                <span className="text-xs font-black text-white/60">VISA</span>
              </div>
            </div>
          ))}
        </div>

        {/* Card controls */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Freeze",   icon: Snowflake, href: "/support?message=I%20need%20help%20freezing%20or%20unfreezing%20my%20card." },
            { label: "Settings", icon: Settings2, href: "/profile" },
            { label: "Details",  icon: Eye,       href: "/cards#details" },
            { label: "Add Card", icon: Plus,      href: "/cards#apply" },
          ].map((a) => (
            <Link key={a.label} href={a.href} className="card-dark p-4 flex flex-col items-center gap-2 hover:bg-white/6 transition">
              <div className="size-11 rounded-full bg-white/8 border border-white/10 flex items-center justify-center">
                <a.icon className="size-5 text-white/60" />
              </div>
              <span className="text-xs font-bold text-white/60">{a.label}</span>
            </Link>
          ))}
        </div>

        {/* Card details */}
        <div id="details" className="grid grid-cols-2 gap-4">
          <div className="card-dark p-5">
            <p className="text-xs text-white/40 uppercase tracking-wider">Available Credit</p>
            <p className="text-2xl font-black text-white mt-1">$18,750</p>
          </div>
          <div className="card-dark p-5">
            <p className="text-xs text-white/40 uppercase tracking-wider">Cashback Rate</p>
            <p className="text-2xl font-black text-green mt-1">2.4%</p>
          </div>
        </div>

        {/* Apply for new card */}
        <div id="apply" className="card-dark p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="size-10 rounded-xl bg-green/15 flex items-center justify-center">
              <CreditCard className="size-5 text-green" />
            </div>
            <div>
              <h3 className="font-black text-white">Apply for a new card</h3>
              <p className="text-xs text-white/40">Classic, Gold, Platinum, or Signature</p>
            </div>
          </div>
          <CardApplicationForm />
        </div>
      </div>
    </ProtectedShell>
  );
}
