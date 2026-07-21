import { redirect } from "next/navigation";
import Link from "next/link";
import { CreditCard, Headphones, LineChart, Settings2, ShieldCheck, UserCircle } from "lucide-react";
import { ProtectedShell } from "@/components/layout/protected-shell";
import { getCurrentUser } from "@/lib/auth";

const moreItems = [
  { href: "/cards", label: "Cards", body: "Applications, cards, and premium benefits", icon: CreditCard },
  { href: "/support", label: "Support", body: "Live chat, tickets, and secure documents", icon: Headphones },
  { href: "/retirement", label: "401(k)", body: "Retirement portfolio, withdrawals, and documents", icon: LineChart },
  { href: "/profile", label: "Profile", body: "Personal details, security, language, and theme", icon: UserCircle },
  { href: "/kyc", label: "Verification", body: "KYC documents, notes, and review history", icon: ShieldCheck },
  { href: "/profile", label: "Settings", body: "Account preferences and secure sessions", icon: Settings2 }
];

export const dynamic = "force-dynamic";

export default async function MorePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <ProtectedShell>
      <div className="mx-auto max-w-3xl space-y-5 fade-up">
        <div>
          <h1 className="text-3xl font-black text-white">More</h1>
          <p className="mt-1 text-sm text-white/50">Everything else in your mobile banking experience.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {moreItems.map((item) => {
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
