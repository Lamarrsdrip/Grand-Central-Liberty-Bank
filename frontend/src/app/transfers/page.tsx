import { redirect } from "next/navigation";
import { ProtectedShell } from "@/components/layout/protected-shell";
import { TransferFlow } from "@/components/banking/transfer-flow";
import { getCurrentUser } from "@/lib/auth";
import { getUserDashboardData } from "@/lib/data";
import { prisma } from "@/lib/db";
import { getServerTranslations } from "@/lib/i18n/server-locale";
import { formatInCurrency } from "@/lib/currency";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function TransfersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { tx } = getServerTranslations(user.preferredLocale);
  const pCurrency = user.preferredCurrency ?? "USD";

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
    // Explicit coercion: Prisma returns Float as JS number, but guard against
    // Decimal128 objects or string serialization from older MongoDB drivers
    availableBalance: Number.isFinite(Number(a.availableBalance))
      ? Number(a.availableBalance)
      : parseFloat(String(a.availableBalance)) || 0,
    currency: (a.currency ?? "USD").trim().toUpperCase(),
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

        {recentTransfers.length > 0 && (
          <div className="card-dark p-5">
            <p className="text-sm font-black text-white mb-3">{tx.transfer_recent_title}</p>
            <div className="space-y-2">
              {recentTransfers.slice(0, 5).map((t) => {
                const statusColor =
                  t.status === "APPROVED" ? "text-emerald-400" :
                  t.status === "REJECTED" || t.status === "CANCELLED" ? "text-red-400" :
                  "text-amber-400";
                return (
                  <div key={t.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white/5 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-white">{t.beneficiaryName}</p>
                      <p className={`text-xs ${statusColor}`}>
                        {t.status.replace("_", " ")} · {formatDate(t.createdAt)}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-black text-white">
                      {formatInCurrency(Number(t.amount), pCurrency)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </ProtectedShell>
  );
}
