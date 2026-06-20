import { redirect } from "next/navigation";
import { ProtectedShell } from "@/components/layout/protected-shell";
import { TransferFlow } from "@/components/banking/transfer-flow";
import { getCurrentUser } from "@/lib/auth";
import { getUserDashboardData } from "@/lib/data";
import { prisma } from "@/lib/db";
import { getServerTranslations } from "@/lib/i18n/server-locale";

export const dynamic = "force-dynamic";

export default async function TransfersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { tx } = getServerTranslations(user.preferredLocale);

  const [data, savedBeneficiaries, recentTransfers] = await Promise.all([
    getUserDashboardData(user.id),
    prisma.savedBeneficiary.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" }
    }).catch(() => []),
    prisma.transferRequest.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 15
    }).catch(() => [])
  ]);

  const accounts = data.accounts.map((a) => ({
    id: a.id,
    type: a.type,
    accountNumber: a.accountNumber,
    availableBalance: Number(a.availableBalance),
    currency: a.currency,
  }));

  // Derive recent unique recipients from past transfers
  const seen = new Set<string>();
  const recentRecipients = recentTransfers
    .filter((t) => {
      const key = `${t.beneficiaryName}|${t.beneficiaryAccount ?? ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 5)
    .map((t) => ({
      name: t.beneficiaryName,
      bankName: t.beneficiaryBank ?? "",
      accountNumber: t.beneficiaryAccount ?? "",
      routingSwift: t.ibanSwift ?? "",
      recipientCountry: t.recipientCountry ?? "",
      currency: t.currency,
    }));

  return (
    <ProtectedShell>
      <div className="max-w-2xl mx-auto space-y-5 fade-up">
        <div>
          <h1 className="text-3xl font-black text-white">{tx.transfer_title}</h1>
          <p className="text-sm text-white/50 mt-1">{tx.transfer_page_desc}</p>
        </div>
        <TransferFlow
          accounts={accounts}
          settings={data.transferSettings}
          savedBeneficiaries={savedBeneficiaries.map((b) => ({
            id: b.id,
            nickname: b.nickname ?? null,
            recipientName: b.recipientName,
            bankName: b.bankName,
            accountNumber: b.accountNumber,
            routingSwift: b.routingSwift ?? "",
            recipientCountry: b.recipientCountry,
            currency: b.currency,
          }))}
          recentRecipients={recentRecipients}
        />
      </div>
    </ProtectedShell>
  );
}
