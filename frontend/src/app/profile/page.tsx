import { redirect } from "next/navigation";
import { Fingerprint, Globe, LockKeyhole, UserRound } from "lucide-react";
import { KycForm, ProfileForm } from "@/components/banking/workflow-forms";
import { StatusBadge } from "@/components/banking/status-badge";
import { ProtectedShell } from "@/components/layout/protected-shell";
import { PageHeader } from "@/components/banking/premium-ui";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { CurrencySwitcher } from "@/components/layout/currency-switcher";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { getUserDashboardData } from "@/lib/data";
import { formatDate } from "@/lib/utils";
import { getServerTranslations } from "@/lib/i18n/server-locale";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const data = await getUserDashboardData(user.id);
  if (!data.user) redirect("/login");
  const { tx } = getServerTranslations(user.preferredLocale);

  return (
    <ProtectedShell>
      <div className="grid gap-8 soft-appear">
        <PageHeader
          title={tx.profile_page_title}
          description={tx.profile_page_desc}
        />
        <section className="grid gap-4 lg:grid-cols-3">
          {[
            { title: tx.profile_personal, body: `${data.user.firstName} ${data.user.lastName}`, icon: UserRound },
            { title: tx.profile_kyc, body: tx.profile_kyc_desc, icon: Fingerprint },
            { title: tx.profile_security, body: tx.profile_security_access_desc, icon: LockKeyhole }
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="premium-hover glass-panel rounded-[1.5rem] p-5">
                <Icon className="text-primary" data-icon="inline-start" />
                <h2 className="mt-5 text-xl font-black">{item.title}</h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.body}</p>
              </div>
            );
          })}
        </section>
        <div className="grid gap-5 xl:grid-cols-[1fr_28rem]">
        <div className="grid gap-5">
          <ProfileForm
            profile={{
              firstName: data.user.firstName,
              lastName: data.user.lastName,
              phone: data.user.phone,
              country: data.user.country,
              address: data.user.address
            }}
          />
          <Card>
            <CardHeader>
              <CardTitle>{tx.profile_verification_notes}</CardTitle>
              <CardDescription>{tx.profile_verification_notes_desc}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {data.user.kycSubmissions.map((submission) => (
                <div key={submission.id} className="rounded-md border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-bold">{submission.documentType}</p>
                    <StatusBadge status={submission.status} />
                  </div>
                  {submission.notesHistory.map((note) => (
                    <p key={note.id} className="mt-2 text-sm text-muted-foreground">{formatDate(note.createdAt)} · {note.body}</p>
                  ))}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
        <div className="grid gap-5">
          <KycForm />
          <Card>
            <CardHeader>
              <CardTitle>{tx.profile_security_card}</CardTitle>
              <CardDescription>{tx.profile_security_state_desc}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="flex items-center justify-between"><span className="font-semibold">{tx.profile_email}</span><StatusBadge status={data.user.emailVerifiedAt ? "APPROVED" : "PENDING"} /></div>
              <div className="flex items-center justify-between"><span className="font-semibold">{tx.profile_2fa}</span><StatusBadge status={data.user.twoFactorEnabled ? "ACTIVE" : "PENDING"} /></div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Globe className="size-4" /> {tx.profile_lang_currency}</CardTitle>
              <CardDescription>{tx.profile_lang_currency_desc}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-1.5">
                <p className="text-sm font-semibold text-white/70">{tx.profile_display_language}</p>
                <LocaleSwitcher value={data.user.preferredLocale ?? "en"} />
              </div>
              <div className="grid gap-1.5">
                <p className="text-sm font-semibold text-white/70">{tx.profile_display_currency}</p>
                <CurrencySwitcher value={(data.user as { preferredCurrency?: string }).preferredCurrency ?? "USD"} />
              </div>
            </CardContent>
          </Card>
        </div>
        </div>
      </div>
    </ProtectedShell>
  );
}
