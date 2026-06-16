"use client";

import Link from "next/link";
import { useState } from "react";
import { Search, Plus, ChevronRight, Building2, ShieldCheck, Delete, Check, AlertTriangle } from "lucide-react";
import { secureFetch } from "@/lib/client-api";
import { formatCurrency, initials } from "@/lib/utils";
import { accountLabel } from "@/components/banking/finance";

type Account = { id: string; type: string; accountNumber: string; availableBalance: number; currency: string };
type TransferSettings = { reviewMessage: string; buttonText: string; supportInstructions: string };
type TransferResult = {
  state: "review" | "failed";
  message: string;
  amount: number;
  beneficiary: string;
  reference: string;
  reason: string;
};

const recentRecipients = [
  { name: "Olivia M.", color: "#ec4899" },
  { name: "James T.",  color: "#3b82f6" },
  { name: "Sofia R.",  color: "#f59e0b" },
  { name: "Michael B.",color: "#8b5cf6" },
];

const savedBeneficiaries = [
  { name: "Premium Payments LLC", acct: "4321", tag: "Business", icon: "card" },
  { name: "Alex Morgan",          acct: "7890", tag: "Personal", icon: "person" },
  { name: "Global Contractors Inc.", acct: "1122", tag: "Business", icon: "bank" },
];

const transferTypes = ["Domestic", "International", "Same Bank", "Wire"];

export function TransferFlow({ accounts, settings }: { accounts: Account[]; settings: TransferSettings }) {
  const [amount, setAmount] = useState("0");
  const [selectedType, setSelectedType] = useState("Domestic");
  const [step, setStep] = useState<"compose" | "review" | "success">("compose");
  const [recipient, setRecipient] = useState<string | null>(null);
  const [recipientDraft, setRecipientDraft] = useState("");
  const [fromAccountId, setFromAccountId] = useState(accounts[0]?.id ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<TransferResult | null>(null);

  const numericAmount = parseFloat(amount.replace(/,/g, "")) || 0;
  const fromAccount = accounts.find((account) => account.id === fromAccountId);
  const fee = 0;
  const total = numericAmount + fee;
  const beneficiary = recipient ?? recipientDraft.trim();
  const insufficientFunds = Boolean(fromAccount && numericAmount > fromAccount.availableBalance);
  const canReview = numericAmount > 0 && Boolean(fromAccount) && Boolean(beneficiary) && !insufficientFunds;

  function press(key: string) {
    setAmount((prev) => {
      const clean = prev.replace(/,/g, "");
      if (key === "del") {
        const next = clean.slice(0, -1) || "0";
        return formatNum(next);
      }
      if (key === ".") {
        if (clean.includes(".")) return prev;
        return clean + ".";
      }
      const next = clean === "0" ? key : clean + key;
      return formatNum(next);
    });
  }

  function formatNum(v: string) {
    if (v.includes(".")) {
      const [int, dec] = v.split(".");
      return Number(int).toLocaleString("en-US") + "." + dec.slice(0, 2);
    }
    return Number(v).toLocaleString("en-US");
  }

  async function submit() {
    setSubmitting(true);
    try {
      if (!fromAccount) {
        throw new Error("Select a source account before submitting this transfer.");
      }
      if (!beneficiary) {
        throw new Error("Select or enter a beneficiary before submitting this transfer.");
      }
      const data = await secureFetch("/api/transfers", {
        method: "POST",
        body: JSON.stringify({
          fromAccountId: fromAccount.id,
          type: selectedType === "International" ? "INTERNATIONAL" : selectedType === "Same Bank" ? "INTERNAL" : "DOMESTIC",
          amount: String(numericAmount),
          beneficiaryName: beneficiary,
          purpose: "Online transfer",
        }),
      });
      const reviewMessage = data.message?.reviewMessage ?? settings.reviewMessage;
      setResult({
        state: "review",
        message: reviewMessage,
        amount: numericAmount,
        beneficiary,
        reference: data.transfer?.id ?? "Pending reference",
        reason: reviewMessage
      });
      setStep("success");
    } catch (error) {
      const reason = error instanceof Error ? error.message : settings.reviewMessage;
      setResult({
        state: "failed",
        message: reason,
        amount: numericAmount,
        beneficiary,
        reference: "Not created",
        reason
      });
      setStep("success");
    } finally {
      setSubmitting(false);
    }
  }

  if (step === "success") {
    const supportMessage = result
      ? `My transfer of ${formatCurrency(result.amount)} to ${result.beneficiary} ${result.state === "failed" ? "failed" : "requires review"}.\nReason: ${result.reason}\nReference: ${result.reference}\nPlease assist me.`
      : "";
    const ResultIcon = result?.state === "failed" ? AlertTriangle : Check;
    return (
      <div className="card-dark p-8 text-center mb-32 lg:mb-24 fade-up">
        <div className={`size-20 rounded-full ${result?.state === "failed" ? "bg-red-500/15" : "bg-green/15"} flex items-center justify-center mx-auto mb-5`}>
          <ResultIcon className={`size-10 ${result?.state === "failed" ? "text-red-300" : "text-green"}`} />
        </div>
        <h2 className="text-2xl font-black text-white">{result?.state === "failed" ? "Transfer Not Submitted" : "Transfer Requires Review"}</h2>
        <p className="text-white/50 mt-2">{result?.message ?? settings.reviewMessage}</p>
        <div className="mt-6 bg-white/5 rounded-2xl p-4 text-left space-y-2">
          <div className="flex justify-between text-sm"><span className="text-white/40">Amount</span><span className="font-bold text-white">{formatCurrency(result?.amount ?? numericAmount)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-white/40">Beneficiary</span><span className="font-bold text-white">{result?.beneficiary ?? beneficiary}</span></div>
          <div className="flex justify-between text-sm"><span className="text-white/40">Type</span><span className="font-bold text-white">{selectedType}</span></div>
          <div className="flex justify-between text-sm"><span className="text-white/40">Reference</span><span className="font-bold text-white">{result?.reference ?? "Pending reference"}</span></div>
          <div className="flex justify-between text-sm"><span className="text-white/40">Status</span><span className={`font-bold ${result?.state === "failed" ? "text-red-300" : "text-green"}`}>{result?.state === "failed" ? "Failed" : "Under Review"}</span></div>
        </div>
        <Link
          href={`/support?message=${encodeURIComponent(supportMessage)}`}
          className="mt-6 block w-full bg-white text-black font-black py-3.5 rounded-2xl hover:bg-white/90 transition"
        >
          {settings.buttonText || "CONTACT LIVE SUPPORT"}
        </Link>
        <button onClick={() => { setStep("compose"); setAmount("0"); setRecipient(null); setRecipientDraft(""); setResult(null); }}
          className="mt-3 w-full bg-green text-black font-bold py-3.5 rounded-2xl hover:bg-green-dim transition">
          Done
        </button>
      </div>
    );
  }

  if (step === "review") {
    return (
      <div className="card-dark p-6 mb-32 lg:mb-24 fade-up">
        <h2 className="text-xl font-black text-white mb-5">Review Transfer</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between bg-white/5 rounded-2xl p-4">
            <span className="text-white/40 text-sm">To</span>
            <span className="font-bold text-white">{beneficiary}</span>
          </div>
          <div className="flex items-center justify-between bg-white/5 rounded-2xl p-4">
            <span className="text-white/40 text-sm">From</span>
            <span className="font-bold text-white">{fromAccount ? `${accountLabel(fromAccount.type)} •••• ${fromAccount.accountNumber.slice(-4)}` : "No account selected"}</span>
          </div>
          <div className="flex items-center justify-between bg-white/5 rounded-2xl p-4">
            <span className="text-white/40 text-sm">Amount</span>
            <span className="font-black text-white text-lg">{formatCurrency(numericAmount)}</span>
          </div>
          <div className="flex items-center justify-between bg-white/5 rounded-2xl p-4">
            <span className="text-white/40 text-sm">Fee</span>
            <span className="font-bold text-white">{formatCurrency(fee)}</span>
          </div>
          <div className="flex items-center justify-between bg-white/5 rounded-2xl p-4">
            <span className="text-white/40 text-sm">Total</span>
            <span className="font-black text-green text-lg">{formatCurrency(total)}</span>
          </div>
          <div className="flex items-center justify-between bg-white/5 rounded-2xl p-4">
            <span className="text-white/40 text-sm">Arrives</span>
            <span className="font-bold text-white">May 27, 2026</span>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={() => setStep("compose")} className="flex-1 bg-white/8 border border-white/10 text-white font-bold py-3.5 rounded-2xl hover:bg-white/14 transition">Back</button>
          <button onClick={submit} disabled={submitting || !canReview} className="flex-1 bg-green text-black font-bold py-3.5 rounded-2xl hover:bg-green-dim transition disabled:opacity-60">
            {submitting ? "Submitting…" : "Confirm Transfer"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-32 lg:pb-24">
      {/* Recipient selection */}
      <div className="card-dark p-5">
        <h2 className="text-xl font-black text-white mb-4">Who do you want to send money to?</h2>
        <div className="flex items-center gap-3 bg-white/6 border border-white/8 rounded-2xl px-4 py-3 mb-5">
          <Search className="size-4 text-white/40" />
          <input
            placeholder="Search contacts or enter details"
            value={recipientDraft}
            onChange={(event) => {
              setRecipientDraft(event.target.value);
              setRecipient(null);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && recipientDraft.trim()) {
                event.preventDefault();
                setRecipient(recipientDraft.trim());
              }
            }}
            className="bg-transparent border-0 outline-none text-sm text-white placeholder:text-white/30 flex-1"
          />
        </div>

        {/* Recent recipients */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold text-white/60">Recent Recipients</p>
          <span className="text-xs font-bold text-green">View all</span>
        </div>
        <div className="flex gap-4 overflow-x-auto scrollbar-none pb-1">
          {recentRecipients.map((r) => (
            <button key={r.name} onClick={() => setRecipient(r.name)}
              className={`flex flex-col items-center gap-2 shrink-0 ${recipient === r.name ? "opacity-100" : "opacity-80"}`}>
              <div className="recipient-avatar relative" style={{ background: r.color }}>
                {initials(r.name.split(" ")[0], r.name.split(" ")[1] ?? "")}
                {recipient === r.name && <span className="absolute -bottom-0.5 -right-0.5 size-4 rounded-full bg-green border-2 border-[#161c28] flex items-center justify-center"><Check className="size-2 text-black" /></span>}
              </div>
              <span className="text-xs font-semibold text-white/60 whitespace-nowrap">{r.name}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => setRecipient(recipientDraft.trim() || "New Recipient")}
            className="flex flex-col items-center gap-2 shrink-0"
          >
            <div className="size-12 rounded-full border-2 border-dashed border-white/15 flex items-center justify-center text-white/40">
              <Plus className="size-5" />
            </div>
            <span className="text-xs font-semibold text-white/40">Add New</span>
          </button>
        </div>

        {/* Saved beneficiaries */}
        <div className="flex items-center justify-between mt-6 mb-3">
          <p className="text-sm font-bold text-white/60">Saved Beneficiaries</p>
          <span className="text-xs font-bold text-green">View all</span>
        </div>
        <div className="space-y-2">
          {savedBeneficiaries.map((b) => (
            <button key={b.name} onClick={() => setRecipient(b.name)}
              className={`w-full flex items-center gap-3 rounded-2xl p-3 transition ${recipient === b.name ? "bg-green/10 border border-green/30" : "bg-white/5 border border-white/8 hover:bg-white/8"}`}>
              <div className="size-10 rounded-xl bg-white/10 flex items-center justify-center">
                <Building2 className="size-5 text-white/50" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-bold text-white text-sm">{b.name}</p>
                <p className="text-xs text-white/40">•••• {b.acct}</p>
              </div>
              <span className="text-xs font-bold text-white/40 bg-white/8 px-2.5 py-1 rounded-full">{b.tag}</span>
              <ChevronRight className="size-4 text-white/30" />
            </button>
          ))}
        </div>
      </div>

      {/* Transfer type */}
      <div className="card-dark p-5">
        <p className="text-sm font-bold text-white/60 mb-3">From Account</p>
        <div className="space-y-2 mb-5">
          {accounts.map((account) => (
            <button
              key={account.id}
              type="button"
              onClick={() => setFromAccountId(account.id)}
              className={`w-full flex items-center justify-between rounded-2xl p-3 text-left transition ${fromAccountId === account.id ? "bg-green/10 border border-green/30" : "bg-white/5 border border-white/8 hover:bg-white/8"}`}
            >
              <span>
                <span className="block text-sm font-black text-white">{accountLabel(account.type)} •••• {account.accountNumber.slice(-4)}</span>
                <span className="block text-xs text-white/40">Available {formatCurrency(account.availableBalance, account.currency)}</span>
              </span>
              {fromAccountId === account.id ? <Check className="size-4 text-green" /> : <ChevronRight className="size-4 text-white/30" />}
            </button>
          ))}
        </div>
        <p className="text-sm font-bold text-white/60 mb-3">Transfer Type</p>
        <div className="flex gap-2 flex-wrap">
          {transferTypes.map((t) => (
            <button key={t} onClick={() => setSelectedType(t)}
              className={`transfer-type-pill ${selectedType === t ? "selected" : ""}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Amount + keypad */}
      <div className="card-dark p-5">
        <p className="text-sm font-bold text-white/60 mb-2">Amount (USD)</p>
        <div className="flex items-center justify-between bg-white/5 rounded-2xl px-5 py-4 mb-4">
          <span className="text-3xl font-black text-white">${amount}</span>
          <button onClick={() => setAmount("0")} className="size-7 rounded-full bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition">
            ✕
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-white/5 rounded-xl p-3 text-center">
            <p className="text-xs text-white/40">Fee (Estimated)</p>
            <p className="font-black text-white mt-0.5">{formatCurrency(fee)}</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3 text-center">
            <p className="text-xs text-white/40">Total</p>
            <p className="font-black text-white mt-0.5">{formatCurrency(total)}</p>
          </div>
        </div>
        {fromAccount ? (
          <div className={`flex items-center gap-2 rounded-xl px-4 py-2.5 mb-4 ${insufficientFunds ? "bg-red-500/10 border border-red-300/20" : "bg-white/5 border border-white/8"}`}>
            <ShieldCheck className={`size-4 shrink-0 ${insufficientFunds ? "text-red-300" : "text-green"}`} />
            <p className="text-xs text-white/60">
              {insufficientFunds
                ? `Insufficient funds. Available ${formatCurrency(fromAccount.availableBalance, fromAccount.currency)}.`
                : `Sending from ${accountLabel(fromAccount.type)} •••• ${fromAccount.accountNumber.slice(-4)}.`}
            </p>
          </div>
        ) : null}

        <div className="flex items-center gap-2 bg-green/10 border border-green/20 rounded-xl px-4 py-2.5 mb-4">
          <ShieldCheck className="size-4 text-green shrink-0" />
          <p className="text-xs text-white/60">Arrives May 27, 2026 · Transfer before 4:00 PM ET</p>
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-2.5 mb-5">
          {["1","2","3","4","5","6","7","8","9",".","0","del"].map((k) => (
            <button key={k} onClick={() => press(k)} className="keypad-btn">
              {k === "del" ? <Delete className="size-5" /> : k}
            </button>
          ))}
        </div>

        <button
          onClick={() => canReview && setStep("review")}
          disabled={!canReview}
          className="w-full bg-green text-black font-black py-4 rounded-2xl hover:bg-green-dim transition disabled:opacity-40 disabled:cursor-not-allowed">
          Review Transfer
        </button>
      </div>
    </div>
  );
}
