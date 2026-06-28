import { redirect } from "next/navigation";
import Link from "next/link";
import { CreditCard, Headphones, LineChart, Settings2, ShieldCheck, UserCircle } from "lucide-react";
import { ProtectedShell } from "@/components/layout/protected-shell";
import { ChatMoreCard } from "@/components/layout/chat-more-card";
import { getCurrentUser } from "@/lib/auth";
import { getServerTranslations } from "@/lib/i18n/server-locale";

export const dynamic = "force-dynamic";

export default async function MorePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { tx } = getServerTranslations(user.preferredLocale);

  const linkItems = [
    { href: "/cards",       label: tx.nav_cards,              body: tx.more_cards_body,        icon: CreditCard  },
    { href: "/retirement",  label: "401(k)",                  body: tx.more_retirement_body,   icon: LineChart   },
    { href: "/profile",     label: tx.nav_profile,            body: tx.more_profile_body,      icon: UserCircle  },
    { href: "/profile#kyc", label: tx.more_verification_label, body: tx.more_verification_body, icon: ShieldCheck },
    { href: "/profile",     label: tx.more_settings_label,    body: tx.more_settings_body,     icon: Settings2   },
  ];

  return (
    <ProtectedShell>
      <div className="mx-auto max-w-3xl space-y-5 fade-up">
        <div>
          <h1 className="text-3xl font-black text-white">{tx.more_page_title}</h1>
          <p className="mt-1 text-sm text-white/50">{tx.more_page_desc}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {/* Live Chat — opens floating widget */}
          <ChatMoreCard label={tx.nav_support} body={tx.more_support_body} />
          {/* All other links navigate normally */}
          {linkItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={`${item.href}-${item.label}`} href={item.href} className="card-dark block p-5 transition hover:bg-white/6">
                <Icon className="size-5 text-green" />
                <p className="mt-4 text-lg font-black text-white">{item.label}</p>
                <p className="mt-1 text-sm text-white/45">{item.body}</p>
              </Link>
            );
          })}
        </div>
      </div>
    </ProtectedShell>
  );
}
