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

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const data = await getUserDashboardData(user.id);
  if (!data.user) redirect("/login");

  return (
    <ProtectedShell>
      <div className="grid gap-8 soft-appear">
        <PageHeader
          title="Profile, identity, and security."
          description="Manage contact information, verification packages, KYC notes, email verification, and 2FA from one private banking profile."
        />
        <section className="grid gap-4 lg:grid-cols-3">
          {[
            { title: "Personal profile", body: `${data.user.firstName} ${data.user.lastName}`, icon: UserRound },
            { title: "Manual KYC", body: "Government ID and selfie review history.", icon: Fingerprint },
            { title: "Secure access", body: "Email verification and 2FA controls.", icon: LockKeyhole }
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
              <CardTitle>Verification Notes</CardTitle>
              <CardDescription>Manual KYC review history visible to you.</CardDescription>
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
              <CardTitle>Security</CardTitle>
              <CardDescription>Email verification and 2FA state.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="flex items-center justify-between"><span className="font-semibold">Email</span><StatusBadge status={data.user.emailVerifiedAt ? "APPROVED" : "PENDING"} /></div>
              <div className="flex items-center justify-between"><span className="font-semibold">2FA</span><StatusBadge status={data.user.twoFactorEnabled ? "ACTIVE" : "PENDING"} /></div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Globe className="size-4" /> Language &amp; Currency</CardTitle>
              <CardDescription>Set your preferred display language and currency. Changes apply immediately across the app.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-1.5">
                <p className="text-sm font-semibold text-white/70">Display language</p>
                <LocaleSwitcher value={data.user.preferredLocale ?? "en"} />
              </div>
              <div className="grid gap-1.5">
                <p className="text-sm font-semibold text-white/70">Display currency</p>
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
