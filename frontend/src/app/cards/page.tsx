import { redirect } from "next/navigation";
import Link from "next/link";
import { Snowflake, Settings2, Eye, CreditCard, Clock, CheckCircle2, XCircle, AlertCircle, FileText } from "lucide-react";
import { ProtectedShell } from "@/components/layout/protected-shell";
import { CardApplicationForm } from "@/components/banking/workflow-forms";
import { getCurrentUser } from "@/lib/auth";
import { getUserDashboardData } from "@/lib/data";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const CARD_GRADIENTS: Record<string, string> = {
  CLASSIC:   "from-slate-700 via-slate-800 to-slate-900",
  GOLD:      "from-amber-800 via-yellow-900 to-slate-900",
  PLATINUM:  "from-blue-900 via-slate-800 to-slate-900",
  SIGNATURE: "from-slate-900 via-slate-800 to-black",
};

const CARD_LABELS: Record<string, string> = {
  CLASSIC:   "Liberty Classic",
  GOLD:      "Liberty Gold",
  PLATINUM:  "Liberty Platinum",
  SIGNATURE: "Liberty Signature",
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  APPROVED:      { label: "Active", color: "text-green", icon: CheckCircle2 },
  SUBMITTED:     { label: "Under Review", color: "text-amber-400", icon: Clock },
  UNDER_REVIEW:  { label: "Under Review", color: "text-amber-400", icon: Clock },
  INFO_REQUESTED:{ label: "Info Needed", color: "text-orange-400", icon: AlertCircle },
  REJECTED:      { label: "Declined", color: "text-red-400", icon: XCircle },
};

export default async function CardsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const data = await getUserDashboardData(user.id);

  const cards = data.cards ?? [];
  const approvedCards = cards.filter((c) => c.status === "APPROVED");
  const pendingCards  = cards.filter((c) => c.status !== "APPROVED");

  return (
    <ProtectedShell>
      <div className="max-w-3xl mx-auto space-y-5 fade-up">
        <div>
          <h1 className="text-3xl font-black text-white">Cards</h1>
          <p className="text-sm text-white/50 mt-1">Manage your cards and applications.</p>
        </div>

        {/* Issued cards */}
        {approvedCards.length > 0 && (
          <>
            <div className="flex gap-4 overflow-x-auto scrollbar-none pb-2">
              {approvedCards.map((c) => (
                <div
                  key={c.id}
                  className={`shrink-0 w-80 bg-gradient-to-br ${CARD_GRADIENTS[c.type] ?? CARD_GRADIENTS.CLASSIC} rounded-2xl p-6 border border-white/10 premium-metal-card`}
                >
                  <div className="flex items-center justify-between mb-8">
                    <p className="text-[0.6rem] font-bold tracking-widest text-white/40">GRAND CENTRAL LIBERTY BANK</p>
                    <div className="flex items-center gap-0.5">
                      <div className="size-6 rounded-full bg-amber-400/70" />
                      <div className="size-6 rounded-full bg-amber-600/70 -ml-2.5" />
                    </div>
                  </div>
                  <p className="text-lg font-black tracking-[0.2em] text-white/80">
                    •••• •••• •••• {c.id.slice(-4).toUpperCase()}
                  </p>
                  <div className="mt-5 flex items-end justify-between">
                    <div>
                      <p className="text-[0.55rem] text-white/40 uppercase">{CARD_LABELS[c.type]}</p>
                      <p className="text-xs font-bold text-white/70">
                        {c.type === "CLASSIC" || c.type === "GOLD" ? "Debit · Visa" : "Credit · Visa"}
                      </p>
                    </div>
                    <span className="text-xs font-black text-white/60">VISA</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Card actions */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: "Freeze",   icon: Snowflake, href: "/support?message=I%20need%20help%20freezing%20or%20unfreezing%20my%20card." },
                { label: "Settings", icon: Settings2, href: "/profile" },
                { label: "Details",  icon: Eye,       href: "/support?message=I%20need%20my%20full%20card%20details%20securely." },
                { label: "Report",   icon: FileText,  href: "/support?message=I%20would%20like%20to%20report%20an%20issue%20with%20my%20card." },
              ].map((a) => (
                <Link key={a.label} href={a.href} className="card-dark p-4 flex flex-col items-center gap-2 hover:bg-white/6 transition">
                  <div className="size-11 rounded-full bg-white/8 border border-white/10 flex items-center justify-center">
                    <a.icon className="size-5 text-white/60" />
                  </div>
                  <span className="text-xs font-bold text-white/60">{a.label}</span>
                </Link>
              ))}
            </div>
          </>
        )}

        {/* Pending applications */}
        {pendingCards.length > 0 && (
          <div className="card-dark p-5">
            <h3 className="font-black text-white mb-4">Card Applications</h3>
            <div className="space-y-3">
              {pendingCards.map((c) => {
                const cfg = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.SUBMITTED;
                const Icon = cfg.icon;
                return (
                  <div key={c.id} className="flex items-center justify-between bg-white/5 rounded-2xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-xl bg-white/8 border border-white/10 flex items-center justify-center">
                        <CreditCard className="size-5 text-white/50" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{CARD_LABELS[c.type]}</p>
                        <p className="text-xs text-white/40">Applied {formatDate(c.createdAt)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Icon className={`size-4 ${cfg.color}`} />
                      <span className={`text-xs font-bold ${cfg.color}`}>{cfg.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty state when no cards at all */}
        {cards.length === 0 && (
          <div className="card-dark p-8 text-center">
            <div className="size-16 rounded-full bg-white/5 border border-dashed border-white/15 flex items-center justify-center mx-auto mb-4">
              <CreditCard className="size-7 text-white/25" />
            </div>
            <p className="font-black text-white">No cards yet</p>
            <p className="text-sm text-white/40 mt-1">Apply for a card below to get started.</p>
          </div>
        )}

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
