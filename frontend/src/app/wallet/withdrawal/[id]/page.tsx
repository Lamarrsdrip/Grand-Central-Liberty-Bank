import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ProtectedShell } from "@/components/layout/protected-shell";
import { WithdrawalStatusView } from "@/components/banking/withdrawal-status-view";

export const dynamic = "force-dynamic";

export default async function WithdrawalStatusPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const withdrawal = await prisma.cryptoWithdrawalRequest.findFirst({
    where: { id, userId: user.id }
  });

  if (!withdrawal) redirect("/wallet");

  return (
    <ProtectedShell>
      <WithdrawalStatusView
        withdrawal={{
          id: withdrawal.id,
          asset: withdrawal.asset,
          network: withdrawal.network,
          amount: withdrawal.amount,
          recipientAddress: withdrawal.recipientAddress,
          status: withdrawal.status,
          adminMessage: withdrawal.adminMessage,
          reference: withdrawal.reference,
          createdAt: withdrawal.createdAt.toISOString()
        }}
      />
    </ProtectedShell>
  );
}
