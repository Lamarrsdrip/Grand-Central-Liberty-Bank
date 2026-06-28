"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle, Clock, MessageCircle, XCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type Withdrawal = {
  id: string;
  asset: string;
  network: string;
  amount: number;
  recipientAddress: string;
  status: string;
  adminMessage: string | null;
  reference: string;
  createdAt: string;
};

const STATUS_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string; label: string; heading: string; body: string }> = {
  PENDING_REVIEW: {
    icon: Clock,
    color: "text-amber-400",
    bg: "bg-amber-400/10 border-amber-400/25",
    label: "Manual Review / Pending Approval",
    heading: "Transaction Pending",
    body: "Your crypto withdrawal request has been submitted for manual review.\nContact support to approve withdrawal."
  },
  APPROVED: {
    icon: CheckCircle,
    color: "text-emerald-400",
    bg: "bg-emerald-400/10 border-emerald-400/25",
    label: "Approved",
    heading: "Withdrawal Approved",
    body: "Your withdrawal has been approved and is being processed."
  },
  FAILED: {
    icon: XCircle,
    color: "text-red-400",
    bg: "bg-red-400/10 border-red-400/25",
    label: "Failed",
    heading: "Withdrawal Failed",
    body: "Your withdrawal could not be processed. Please contact support for assistance."
  }
};

export function WithdrawalStatusView({ withdrawal: initial }: { withdrawal: Withdrawal }) {
  const [withdrawal, setWithdrawal] = useState(initial);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/crypto/withdrawals/${withdrawal.id}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.withdrawal) setWithdrawal(data.withdrawal);
      } catch {}
    }, 12000);
    return () => clearInterval(interval);
  }, [withdrawal.id]);

  function openChat() {
    window.dispatchEvent(new CustomEvent("open-support-chat"));
  }

  const cfg = STATUS_CONFIG[withdrawal.status] ?? {
    icon: Clock,
    color: "text-white/60",
    bg: "bg-white/5 border-white/10",
    label: withdrawal.status,
    heading: "Withdrawal Status",
    body: "Please contact support for more information."
  };

  const StatusIcon = cfg.icon;

  return (
    <div className="mx-auto max-w-2xl space-y-5 fade-up">
      <Link href="/wallet" className="inline-flex items-center gap-1.5 text-sm font-semibold text-white/40 hover:text-white transition">
        <ArrowLeft className="size-4" />
        Back to Wallet
      </Link>

      {/* Status hero card */}
      <div className="luxury-hero p-8 text-center">
        <div className={`mx-auto mb-5 size-20 rounded-full border-2 flex items-center justify-center ${cfg.bg}`}>
          <StatusIcon className={`size-10 ${cfg.color}`} />
        </div>
        <h1 className="text-3xl font-black text-white">{cfg.heading}</h1>
        <p className="mt-3 text-sm text-white/55 leading-relaxed whitespace-pre-line">{cfg.body}</p>

        <div className={`mx-auto mt-5 w-fit rounded-full border px-5 py-2 text-xs font-black uppercase tracking-wider ${cfg.bg} ${cfg.color}`}>
          Status: {cfg.label}
        </div>

        {withdrawal.adminMessage && (
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm text-white/65 text-left">
            {withdrawal.adminMessage}
          </div>
        )}
      </div>

      {/* Transaction details */}
      <div className="card-dark p-5 space-y-3">
        <p className="text-sm font-black text-white mb-4">Transaction Details</p>
        {([
          ["Asset", `${withdrawal.asset} (${withdrawal.network})`],
          ["Amount", `${withdrawal.amount} ${withdrawal.asset}`],
          ["Recipient Address", withdrawal.recipientAddress],
          ["Reference", withdrawal.reference],
          ["Submitted", new Date(withdrawal.createdAt).toLocaleString()]
        ] as [string, string][]).map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 text-sm border-b border-white/5 pb-2 last:border-0 last:pb-0">
            <span className="text-white/40 shrink-0">{label}</span>
            <span className="font-semibold text-white text-right break-all">{value}</span>
          </div>
        ))}
      </div>

      {/* Contact support */}
      <Button onClick={openChat} className="w-full h-14 gap-2 text-base font-black" size="lg">
        <MessageCircle className="size-5" />
        Contact Support
      </Button>

      <p className="text-center text-xs text-white/25">
        This page updates automatically. Ref: {withdrawal.reference}
      </p>
    </div>
  );
}
