"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ChevronRight, Building2, ShieldCheck, Delete, Check, AlertTriangle,
  User, CreditCard, Globe, Bookmark, Clock, X, Plus
} from "lucide-react";
import { secureFetch } from "@/lib/client-api";
import { formatCurrency, initials } from "@/lib/utils";
import { accountLabel } from "@/components/banking/finance";

type Account = {
  id: string;
  type: string;
  accountNumber: string;
  availableBalance: number;
  currency: string;
};
type TransferSettings = {
  successMessage?: string;
  reviewMessage: string;
  failedMessage?: string;
  blockedMessage?: string;
  reasonText?: string;
  buttonText: string;
  supportInstructions: string;
  referencePrefix?: string;
};
type SavedBeneficiary = {
  id: string;
  nickname: string | null;
  recipientName: string;
  bankName: string;
  accountNumber: string;
  routingSwift: string;
  recipientCountry: string;
  currency: string;
};
type RecentRecipient = {
  name: string;
  bankName: string;
  accountNumber: string;
  routingSwift: string;
  recipientCountry: string;
  currency: string;
};
type TransferResult = {
  state: "review" | "failed";
  message: string;
  amount: number;
  beneficiary: string;
  reference: string;
  reason: string;
};
type FieldErrors = Partial<Record<string, string>>;

const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "JPY", "CHF", "CNY", "HKD", "SGD", "MXN", "BRL", "NGN", "INR", "ZAR"];
const COUNTRIES = [
  "United States", "United Kingdom", "Canada", "Australia", "Germany", "France",
  "Netherlands", "Switzerland", "Japan", "China", "Hong Kong", "Singapore",
  "Mexico", "Brazil", "Nigeria", "India", "South Africa", "United Arab Emirates",
  "New Zealand", "Spain", "Italy", "Sweden", "Norway", "Denmark", "Belgium",
  "Portugal", "Ireland", "Austria", "Poland", "Czech Republic", "Other"
];

const AVATAR_COLORS = [
  "#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#06b6d4", "#f97316", "#84cc16"
];

function colorFor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1 text-xs text-red-400">{msg}</p>;
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-bold text-white/50 mb-1.5 uppercase tracking-wide">{children}</p>;
}

function Input({
  value, onChange, placeholder, type = "text", className = ""
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  className?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full bg-white/6 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-green/50 focus:bg-white/8 transition ${className}`}
    />
  );
}

function SelectInput({
  value, onChange, options, placeholder
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-white/6 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-green/50 transition appearance-none"
      style={{ colorScheme: "dark" }}
    >
      {placeholder && <option value="" className="bg-[#161c28]">{placeholder}</option>}
      {options.map((o) => (
        <option key={o} value={o} className="bg-[#161c28]">{o}</option>
      ))}
    </select>
  );
}

export function TransferFlow({
  accounts,
  settings,
  savedBeneficiaries,
  recentRecipients,
}: {
  accounts: Account[];
  settings: TransferSettings;
  savedBeneficiaries: SavedBeneficiary[];
  recentRecipients: RecentRecipient[];
}) {
  // Form state
  const [fromAccountId, setFromAccountId] = useState(accounts[0]?.id ?? "");
  const [transferType, setTransferType] = useState<"DOMESTIC" | "INTERNATIONAL" | "INTERNAL">("DOMESTIC");
  const [recipientName, setRecipientName] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [routingSwift, setRoutingSwift] = useState("");
  const [recipientCountry, setRecipientCountry] = useState("United States");
  const [currency, setCurrency] = useState("USD");
  const [purpose, setPurpose] = useState("");
  const [saveBeneficiary, setSaveBeneficiary] = useState(false);
  const [beneficiaryNickname, setBeneficiaryNickname] = useState("");
  const [amount, setAmount] = useState("0");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [step, setStep] = useState<"compose" | "review" | "result">("compose");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<TransferResult | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [beneficiaries, setBeneficiaries] = useState<SavedBeneficiary[]>(savedBeneficiaries);

  const numericAmount = parseFloat(amount.replace(/,/g, "")) || 0;
  const fromAccount = accounts.find((a) => a.id === fromAccountId);
  const insufficientFunds = Boolean(fromAccount && numericAmount > 0 && numericAmount > fromAccount.availableBalance);

  function pressKey(key: string) {
    setAmount((prev) => {
      const clean = prev.replace(/,/g, "");
      if (key === "del") {
        const next = clean.slice(0, -1) || "0";
        return fmtNum(next);
      }
      if (key === ".") {
        return clean.includes(".") ? prev : clean + ".";
      }
      const next = clean === "0" ? key : clean + key;
      return fmtNum(next);
    });
  }

  function fmtNum(v: string) {
    if (v.includes(".")) {
      const [int, dec] = v.split(".");
      return Number(int).toLocaleString("en-US") + "." + dec.slice(0, 2);
    }
    return Number(v).toLocaleString("en-US");
  }

  function fillFromBeneficiary(b: SavedBeneficiary | RecentRecipient) {
    const name = "recipientName" in b ? b.recipientName : b.name;
    setRecipientName(name);
    setBankName(b.bankName);
    setAccountNumber(b.accountNumber);
    setRoutingSwift(b.routingSwift);
    setRecipientCountry(b.recipientCountry || "United States");
    setCurrency(b.currency || "USD");
    setErrors({});
  }

  function validate(): FieldErrors {
    const e: FieldErrors = {};
    if (!recipientName.trim() || recipientName.trim().length < 2)
      e.recipientName = "Recipient full name is required";
    if (!bankName.trim()) e.bankName = "Bank name is required";
    if (!accountNumber.trim() || accountNumber.trim().length < 4)
      e.accountNumber = "Account number / IBAN is required (min 4 characters)";
    if (!recipientCountry) e.recipientCountry = "Recipient country is required";
    if (!currency) e.currency = "Currency is required";
    if (!purpose.trim() || purpose.trim().length < 2)
      e.purpose = "Transfer purpose is required";
    if (numericAmount <= 0) e.amount = "Enter a valid amount greater than 0";
    if (insufficientFunds) e.amount = `Insufficient funds. Available: ${formatCurrency(fromAccount?.availableBalance ?? 0, fromAccount?.currency)}`;
    if (!fromAccountId) e.fromAccountId = "Select a source account";
    return e;
  }

  function goToReview() {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length === 0) setStep("review");
  }

  async function submit() {
    setSubmitting(true);
    try {
      const data = await secureFetch("/api/transfers", {
        method: "POST",
        body: JSON.stringify({
          fromAccountId,
          type: transferType,
          beneficiaryName: recipientName.trim(),
          beneficiaryBank: bankName.trim(),
          beneficiaryAccount: accountNumber.trim(),
          ibanSwift: routingSwift.trim() || undefined,
          recipientCountry,
          amount: numericAmount,
          currency,
          purpose: purpose.trim(),
          saveBeneficiary,
          beneficiaryNickname: beneficiaryNickname.trim() || undefined,
        }),
      });

      if (saveBeneficiary) {
        const newBenef: SavedBeneficiary = {
          id: data.transfer?.id ?? String(Date.now()),
          nickname: beneficiaryNickname.trim() || null,
          recipientName: recipientName.trim(),
          bankName: bankName.trim(),
          accountNumber: accountNumber.trim(),
          routingSwift: routingSwift.trim(),
          recipientCountry,
          currency,
        };
        setBeneficiaries((prev) => [newBenef, ...prev]);
      }

      const reviewMessage = data.message?.reviewMessage ?? settings.reviewMessage;
      const reasonText = data.message?.reasonText ?? settings.reasonText ?? reviewMessage;
      setResult({
        state: "review",
        message: reviewMessage,
        amount: numericAmount,
        beneficiary: recipientName.trim(),
        reference: data.message?.reference ?? data.transfer?.id ?? "Pending",
        reason: reasonText,
      });
      setStep("result");
    } catch (error) {
      const raw = error instanceof Error ? error.message : String(error);
      const clean = /prisma|mongodb|stack|database|server|file:/i.test(raw)
        ? (settings.reasonText ?? "Additional verification is required.")
        : raw;
      setResult({
        state: "failed",
        message: settings.failedMessage ?? settings.reviewMessage,
        amount: numericAmount,
        beneficiary: recipientName.trim(),
        reference: "Not created",
        reason: clean,
      });
      setStep("result");
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteBeneficiary(id: string) {
    setDeletingId(id);
    try {
      await secureFetch("/api/beneficiaries", {
        method: "DELETE",
        body: JSON.stringify({ id }),
      });
      setBeneficiaries((prev) => prev.filter((b) => b.id !== id));
    } catch { /* non-fatal */ }
    setDeletingId(null);
  }

  function resetForm() {
    setStep("compose");
    setAmount("0");
    setRecipientName("");
    setBankName("");
    setAccountNumber("");
    setRoutingSwift("");
    setRecipientCountry("United States");
    setCurrency("USD");
    setPurpose("");
    setSaveBeneficiary(false);
    setBeneficiaryNickname("");
    setErrors({});
    setResult(null);
  }

  // ── Result screen ────────────────────────────────────────────────────────────
  if (step === "result") {
    const supportMsg = result
      ? `Transfer of ${formatCurrency(result.amount)} to ${result.beneficiary} ${result.state === "failed" ? "failed" : "requires review"}.\nReason: ${result.reason}\nReference: ${result.reference}`
      : "";
    const Icon = result?.state === "failed" ? AlertTriangle : Check;

    return (
      <div className="card-dark p-8 text-center mb-32 lg:mb-24 fade-up">
        <div className={`size-20 rounded-full ${result?.state === "failed" ? "bg-red-500/15" : "bg-green/15"} flex items-center justify-center mx-auto mb-5`}>
          <Icon className={`size-10 ${result?.state === "failed" ? "text-red-300" : "text-green"}`} />
        </div>
        <h2 className="text-2xl font-black text-white">
          {result?.state === "failed" ? "Transfer Not Submitted" : "Transfer Under Review"}
        </h2>
        <p className="text-white/50 mt-2">{result?.message ?? settings.reviewMessage}</p>
        {settings.supportInstructions && (
          <p className="mt-2 text-xs text-white/35">{settings.supportInstructions}</p>
        )}
        <div className="mt-6 bg-white/5 rounded-2xl p-4 text-left space-y-2.5">
          {[
            ["Amount", formatCurrency(result?.amount ?? 0)],
            ["To", result?.beneficiary ?? ""],
            ["Type", transferType === "INTERNATIONAL" ? "International" : transferType === "INTERNAL" ? "Same Bank" : "Domestic"],
            ["Currency", currency],
            ["Reference", result?.reference ?? "Pending"],
            ["Status", result?.state === "failed" ? "Failed" : "Under Review"],
          ].map(([label, val]) => (
            <div key={label} className="flex justify-between text-sm">
              <span className="text-white/40">{label}</span>
              <span className={`font-bold ${label === "Status" ? (result?.state === "failed" ? "text-red-300" : "text-green") : "text-white"}`}>{val}</span>
            </div>
          ))}
        </div>
        <Link
          href={`/support?message=${encodeURIComponent(supportMsg)}`}
          className="mt-6 block w-full bg-white text-black font-black py-3.5 rounded-2xl hover:bg-white/90 transition"
        >
          {settings.buttonText || "CONTACT LIVE SUPPORT"}
        </Link>
        <button
          onClick={resetForm}
          className="mt-3 w-full bg-green text-black font-bold py-3.5 rounded-2xl hover:bg-green-dim transition"
        >
          New Transfer
        </button>
      </div>
    );
  }

  // ── Review screen ────────────────────────────────────────────────────────────
  if (step === "review") {
    return (
      <div className="card-dark p-6 mb-32 lg:mb-24 fade-up">
        <h2 className="text-xl font-black text-white mb-5">Review Transfer</h2>
        <div className="space-y-2.5">
          {[
            ["To", recipientName],
            ["Bank", bankName],
            ["Account / IBAN", accountNumber],
            ...(routingSwift ? [["Routing / SWIFT / BIC", routingSwift] as [string, string]] : []),
            ["Country", recipientCountry],
            ["From", fromAccount ? `${accountLabel(fromAccount.type)} •••• ${fromAccount.accountNumber.slice(-4)}` : ""],
            ["Type", transferType === "INTERNATIONAL" ? "International" : transferType === "INTERNAL" ? "Same Bank" : "Domestic"],
            ["Amount", formatCurrency(numericAmount)],
            ["Currency", currency],
            ["Purpose", purpose],
          ].map(([label, val]) => (
            <div key={label} className="flex items-start justify-between bg-white/5 rounded-xl px-4 py-3 gap-3">
              <span className="text-white/40 text-sm shrink-0">{label}</span>
              <span className="font-semibold text-white text-sm text-right">{val}</span>
            </div>
          ))}
          {saveBeneficiary && (
            <div className="flex items-center gap-2 bg-green/10 border border-green/20 rounded-xl px-4 py-3">
              <Bookmark className="size-4 text-green shrink-0" />
              <span className="text-sm text-white/70">
                Will be saved as{beneficiaryNickname ? ` "${beneficiaryNickname}"` : " a beneficiary"}
              </span>
            </div>
          )}
        </div>
        <div className="flex gap-3 mt-6">
          <button
            onClick={() => setStep("compose")}
            className="flex-1 bg-white/8 border border-white/10 text-white font-bold py-3.5 rounded-2xl hover:bg-white/14 transition"
          >
            Back
          </button>
          <button
            onClick={submit}
            disabled={submitting}
            className="flex-1 bg-green text-black font-bold py-3.5 rounded-2xl hover:bg-green-dim transition disabled:opacity-60"
          >
            {submitting ? "Submitting…" : "Confirm Transfer"}
          </button>
        </div>
      </div>
    );
  }

  // ── Compose screen ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 pb-32 lg:pb-24">

      {/* Saved Beneficiaries & Recent */}
      <div className="card-dark p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold text-white/60">Saved Beneficiaries</p>
          {beneficiaries.length > 0 && (
            <span className="text-xs text-white/30">{beneficiaries.length} saved</span>
          )}
        </div>
        {beneficiaries.length === 0 ? (
          <div className="flex items-center gap-3 bg-white/4 border border-dashed border-white/10 rounded-2xl px-4 py-4 mb-4">
            <Bookmark className="size-4 text-white/25 shrink-0" />
            <p className="text-xs text-white/30">No saved beneficiaries yet. Save a recipient after your first transfer.</p>
          </div>
        ) : (
          <div className="space-y-2 mb-4">
            {beneficiaries.map((b) => (
              <div key={b.id} className="flex items-center gap-3">
                <button
                  onClick={() => fillFromBeneficiary(b)}
                  className="flex-1 flex items-center gap-3 rounded-2xl p-3 bg-white/5 border border-white/8 hover:bg-white/8 transition text-left"
                >
                  <div className="size-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                    <Building2 className="size-5 text-white/50" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-white text-sm truncate">
                      {b.nickname || b.recipientName}
                    </p>
                    <p className="text-xs text-white/40 truncate">
                      {b.bankName} · •••{b.accountNumber.slice(-4)}
                    </p>
                  </div>
                  <ChevronRight className="size-4 text-white/30 shrink-0 ml-auto" />
                </button>
                <button
                  onClick={() => deleteBeneficiary(b.id)}
                  disabled={deletingId === b.id}
                  className="size-8 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center text-white/30 hover:text-red-400 hover:border-red-400/30 transition shrink-0 disabled:opacity-40"
                  title="Remove"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold text-white/60">Recent Recipients</p>
        </div>
        {recentRecipients.length === 0 ? (
          <div className="flex items-center gap-3 bg-white/4 border border-dashed border-white/10 rounded-2xl px-4 py-4">
            <Clock className="size-4 text-white/25 shrink-0" />
            <p className="text-xs text-white/30">No recent recipients yet. Complete a transfer to see them here.</p>
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto scrollbar-none pb-1">
            {recentRecipients.map((r) => (
              <button
                key={r.name + r.accountNumber}
                onClick={() => fillFromBeneficiary(r)}
                className="flex flex-col items-center gap-2 shrink-0 opacity-80 hover:opacity-100 transition"
              >
                <div
                  className="size-12 rounded-full flex items-center justify-center text-white text-sm font-black"
                  style={{ background: colorFor(r.name) }}
                >
                  {initials(r.name.split(" ")[0] ?? "", r.name.split(" ")[1] ?? "")}
                </div>
                <span className="text-xs font-semibold text-white/60 whitespace-nowrap max-w-[60px] truncate">{r.name.split(" ")[0]}</span>
              </button>
            ))}
            <button
              onClick={() => {
                setRecipientName(""); setBankName(""); setAccountNumber("");
                setRoutingSwift(""); setErrors({});
              }}
              className="flex flex-col items-center gap-2 shrink-0"
            >
              <div className="size-12 rounded-full border-2 border-dashed border-white/15 flex items-center justify-center text-white/40">
                <Plus className="size-5" />
              </div>
              <span className="text-xs font-semibold text-white/40">New</span>
            </button>
          </div>
        )}
      </div>

      {/* Recipient Details */}
      <div className="card-dark p-5 space-y-4">
        <h2 className="text-base font-black text-white">Recipient Details</h2>

        <div>
          <Label>Recipient Full Name</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/30 pointer-events-none" />
            <input
              type="text"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              placeholder="e.g. Jane Smith"
              className="w-full bg-white/6 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-green/50 focus:bg-white/8 transition"
            />
          </div>
          <FieldError msg={errors.recipientName} />
        </div>

        <div>
          <Label>Bank Name</Label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/30 pointer-events-none" />
            <input
              type="text"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="e.g. Chase Bank"
              className="w-full bg-white/6 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-green/50 focus:bg-white/8 transition"
            />
          </div>
          <FieldError msg={errors.bankName} />
        </div>

        <div>
          <Label>Account Number / IBAN</Label>
          <div className="relative">
            <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/30 pointer-events-none" />
            <input
              type="text"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="Account number or IBAN"
              className="w-full bg-white/6 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-green/50 focus:bg-white/8 transition font-mono"
            />
          </div>
          <FieldError msg={errors.accountNumber} />
        </div>

        <div>
          <Label>Routing / SWIFT / BIC / Sort Code <span className="text-white/25 normal-case font-normal">(optional)</span></Label>
          <Input
            value={routingSwift}
            onChange={setRoutingSwift}
            placeholder={transferType === "INTERNATIONAL" ? "e.g. CHASUS33 (SWIFT)" : "e.g. 021000021 (routing)"}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Recipient Country</Label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/30 pointer-events-none z-10" />
              <select
                value={recipientCountry}
                onChange={(e) => setRecipientCountry(e.target.value)}
                className="w-full bg-white/6 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white outline-none focus:border-green/50 transition appearance-none"
                style={{ colorScheme: "dark" }}
              >
                {COUNTRIES.map((c) => (
                  <option key={c} value={c} className="bg-[#161c28]">{c}</option>
                ))}
              </select>
            </div>
            <FieldError msg={errors.recipientCountry} />
          </div>
          <div>
            <Label>Currency</Label>
            <SelectInput
              value={currency}
              onChange={setCurrency}
              options={CURRENCIES}
            />
            <FieldError msg={errors.currency} />
          </div>
        </div>
      </div>

      {/* Transfer Options */}
      <div className="card-dark p-5 space-y-4">
        <h2 className="text-base font-black text-white">Transfer Options</h2>

        <div>
          <Label>From Account</Label>
          <div className="space-y-2">
            {accounts.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setFromAccountId(a.id)}
                className={`w-full flex items-center justify-between rounded-xl p-3 text-left transition ${fromAccountId === a.id ? "bg-green/10 border border-green/30" : "bg-white/5 border border-white/8 hover:bg-white/8"}`}
              >
                <span>
                  <span className="block text-sm font-black text-white">{accountLabel(a.type)} •••• {a.accountNumber.slice(-4)}</span>
                  <span className="block text-xs text-white/40">Available {formatCurrency(a.availableBalance, a.currency)}</span>
                </span>
                {fromAccountId === a.id ? <Check className="size-4 text-green shrink-0" /> : <ChevronRight className="size-4 text-white/30 shrink-0" />}
              </button>
            ))}
          </div>
          <FieldError msg={errors.fromAccountId} />
        </div>

        <div>
          <Label>Transfer Type</Label>
          <div className="flex gap-2 flex-wrap">
            {(["DOMESTIC", "INTERNATIONAL", "INTERNAL"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTransferType(t)}
                className={`transfer-type-pill ${transferType === t ? "selected" : ""}`}
              >
                {t === "INTERNAL" ? "Same Bank" : t === "INTERNATIONAL" ? "International" : "Domestic"}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label>Transfer Purpose / Note</Label>
          <Input
            value={purpose}
            onChange={setPurpose}
            placeholder="e.g. Invoice payment, Family support, Rent"
          />
          <FieldError msg={errors.purpose} />
        </div>

        {/* Save beneficiary */}
        <div>
          <label className="flex items-start gap-3 cursor-pointer group">
            <div
              onClick={() => setSaveBeneficiary((v) => !v)}
              className={`mt-0.5 size-5 rounded-md border-2 flex items-center justify-center shrink-0 transition ${saveBeneficiary ? "bg-green border-green" : "border-white/20 group-hover:border-white/40"}`}
            >
              {saveBeneficiary && <Check className="size-3 text-black" />}
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Save as beneficiary</p>
              <p className="text-xs text-white/40">Quickly select this recipient for future transfers</p>
            </div>
          </label>
          {saveBeneficiary && (
            <div className="mt-3 ml-8">
              <Label>Nickname (optional)</Label>
              <Input
                value={beneficiaryNickname}
                onChange={setBeneficiaryNickname}
                placeholder="e.g. Mom, Landlord, Business Partner"
              />
            </div>
          )}
        </div>
      </div>

      {/* Amount + Keypad */}
      <div className="card-dark p-5">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-bold text-white/60">Amount</p>
          <span className="text-xs font-bold text-white/30">{currency}</span>
        </div>
        <div className="flex items-center justify-between bg-white/5 rounded-2xl px-5 py-4 mb-4">
          <span className="text-3xl font-black text-white">{currency === "USD" ? "$" : ""}{amount}</span>
          <button
            onClick={() => setAmount("0")}
            className="size-7 rounded-full bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition"
          >
            <X className="size-4" />
          </button>
        </div>
        <FieldError msg={errors.amount} />

        {fromAccount && (
          <div className={`flex items-center gap-2 rounded-xl px-4 py-2.5 mb-4 mt-2 ${insufficientFunds ? "bg-red-500/10 border border-red-300/20" : "bg-white/5 border border-white/8"}`}>
            <ShieldCheck className={`size-4 shrink-0 ${insufficientFunds ? "text-red-300" : "text-green"}`} />
            <p className="text-xs text-white/60">
              {insufficientFunds
                ? `Insufficient funds. Available: ${formatCurrency(fromAccount.availableBalance, fromAccount.currency)}`
                : `Sending from ${accountLabel(fromAccount.type)} •••• ${fromAccount.accountNumber.slice(-4)} · Available ${formatCurrency(fromAccount.availableBalance, fromAccount.currency)}`}
            </p>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2.5 mb-5">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "del"].map((k) => (
            <button key={k} onClick={() => pressKey(k)} className="keypad-btn">
              {k === "del" ? <Delete className="size-5" /> : k}
            </button>
          ))}
        </div>

        <button
          onClick={goToReview}
          className="w-full bg-green text-black font-black py-4 rounded-2xl hover:bg-green-dim transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Review Transfer
        </button>
      </div>
    </div>
  );
}
