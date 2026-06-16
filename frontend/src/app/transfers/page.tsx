import { redirect } from "next/navigation";
import { ProtectedShell } from "@/components/layout/protected-shell";
import { TransferFlow } from "@/components/banking/transfer-flow";
import { getCurrentUser } from "@/lib/auth";
import { getUserDashboardData } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function TransfersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const data = await getUserDashboardData(user.id);
  const accounts = data.accounts.map((a) => ({
    id: a.id,
    type: a.type,
    accountNumber: a.accountNumber,
    availableBalance: Number(a.availableBalance),
    currency: a.currency,
  }));

  return (
    <ProtectedShell>
      <div className="max-w-2xl mx-auto space-y-5 fade-up">
        <div>
          <h1 className="text-3xl font-black text-white">Transfer</h1>
          <p className="text-sm text-white/50 mt-1">Move money securely and instantly.</p>
        </div>
        <TransferFlow accounts={accounts} />
      </div>
    </ProtectedShell>
  );
}
