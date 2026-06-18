"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ChevronLeft, ChevronRight, Building2, ShieldCheck, Delete, Check,
  AlertTriangle, User, CreditCard, Globe, Bookmark, Clock, X, Send,
  ArrowRight, Wallet,
} from "lucide-react";
import { secureFetch } from "@/lib/client-api";
import { formatCurrency, initials } from "@/lib/utils";
import { accountLabel } from "@/components/banking/finance";

/* ─── Types ─────────────────────────────────────────────────────────────── */

type Account = {
  id: string; type: string; accountNumber: string;
  availableBalance: number; currency: string;
};
type TransferSettings = {
  successMessage?: string; reviewMessage: string; failedMessage?: string;
  blockedMessage?: string; reasonText?: string; buttonText: string;
  supportInstructions: string; referencePrefix?: string;
};
type SavedBeneficiary = {
  id: string; nickname: string | null; recipientName: string;
  bankName: string; accountNumber: string; routingSwift: string;
  recipientCountry: string; currency: string;
};
type RecentRecipient = {
  name: string; bankName: string; accountNumber: string;
  routingSwift: string; recipientCountry: string; currency: string;
};
type TransferResult = {
  state: "review" | "failed"; message: string; amount: number;
  beneficiary: string; reference: string; reason: string;
};
type FieldErrors = Partial<Record<string, string>>;
type WizardStep = 1 | 2 | 3 | 4; // 1=Recipient 2=Options 3=Amount 4=Confirm
// "result" is shown after submit, outside the wizard

/* ─── Constants ──────────────────────────────────────────────────────────── */

const CURRENCIES = [
  "USD","EUR","GBP","CAD","AUD","JPY","CHF","CNY","HKD","SGD","MXN","BRL","NGN","INR","ZAR",
];
const COUNTRIES = [
  "United States","United Kingdom","Canada","Australia","Germany","France",
  "Netherlands","Switzerland","Japan","China","Hong Kong","Singapore",
  "Mexico","Brazil","Nigeria","India","South Africa","United Arab Emirates",
  "New Zealand","Spain","Italy","Sweden","Norway","Denmark","Belgium",
  "Portugal","Ireland","Austria","Poland","Czech Republic","Other",
];
const AVATAR_PALETTE = [
  "#3b82f6","#8b5cf6","#ec4899","#f59e0b","#10b981","#06b6d4","#f97316","#84cc16",
];
const STEP_LABELS: Record<WizardStep, string> = {
  1: "Recipient", 2: "Options", 3: "Amount", 4: "Confirm",
};

/* ─── Tiny helpers ───────────────────────────────────────────────────────── */

function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length];
}

function FE({ msg }: { msg?: string }) {
  return msg ? <p className="mt-1.5 text-xs text-red-400 font-semibold">{msg}</p> : null;
}

function FL({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1.5 text-[11px] font-black uppercase tracking-wider text-white/40">
      {children}
    </p>
  );
}

function TextInput({
  value, onChange, placeholder, type = "text", mono = false,
  icon, disabled = false,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string;
  type?: string; mono?: boolean; icon?: React.ReactNode; disabled?: boolean;
}) {
  return (
    <div className="relative">
      {icon && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none">
          {icon}
        </span>
      )}
      <input
        type={type} value={value} disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full bg-white/6 border border-white/10 rounded-xl py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-emerald-400/50 focus:bg-white/8 transition disabled:opacity-50 ${icon ? "pl-10 pr-4" : "px-4"} ${mono ? "font-mono tracking-wider" : ""}`}
      />
    </div>
  );
}

function SelectInput({
  value, onChange, options, placeholder,
}: {
  value: string; onChange: (v: string) => void; options: string[]; placeholder?: string;
}) {
  return (
    <select
      value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full bg-white/6 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-emerald-400/50 transition appearance-none"
      style={{ colorScheme: "dark" }}
    >
      {placeholder && <option value="" className="bg-[#161c28]">{placeholder}</option>}
      {options.map((o) => (
        <option key={o} value={o} className="bg-[#161c28]">{o}</option>
      ))}
    </select>
  );
}

/* ─── Step header ────────────────────────────────────────────────────────── */

function StepHeader({
  step, onBack,
}: {
  step: WizardStep; onBack?: () => void;
}) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <button
        onClick={onBack}
        disabled={!onBack}
        className="size-9 rounded-xl bg-white/6 border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition disabled:opacity-0 disabled:pointer-events-none shrink-0"
      >
        <ChevronLeft className="size-5" />
      </button>

      {/* Progress dots */}
      <div className="flex-1 flex items-center gap-1.5">
        {([1, 2, 3, 4] as WizardStep[]).map((n) => (
          <div
            key={n}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              n < step ? "bg-emerald-400" : n === step ? "bg-emerald-400/60" : "bg-white/10"
            }`}
          />
        ))}
      </div>

      <span className="text-[11px] font-black text-white/35 shrink-0 tabular-nums">
        {step} / 4
      </span>
    </div>
  );
}

/* ─── Quick-pick recipients strip ───────────────────────────────────────── */

function RecipientStrip({
  beneficiaries, recentRecipients, onPick, onDelete, deletingId,
}: {
  beneficiaries: SavedBeneficiary[];
  recentRecipients: RecentRecipient[];
  onPick: (b: SavedBeneficiary | RecentRecipient) => void;
  onDelete: (id: string) => void;
  deletingId: string | null;
}) {
  const hasSaved = beneficiaries.length > 0;
  const hasRecent = recentRecipients.length > 0;
  if (!hasSaved && !hasRecent) return null;

  return (
    <div className="mb-5">
      {hasSaved && (
        <>
          <p className="text-[11px] font-black uppercase tracking-wider text-white/35 mb-2.5 flex items-center gap-1.5">
            <Bookmark className="size-3" /> Saved
          </p>
          <div className="space-y-1.5 mb-4">
            {beneficiaries.map((b) => (
              <div key={b.id} className="flex items-center gap-2">
                <button
                  onClick={() => onPick(b)}
                  className="flex-1 flex items-center gap-3 rounded-xl p-3 bg-white/5 border border-white/8 hover:bg-white/9 hover:border-white/14 transition text-left"
                >
                  <div
                    className="size-9 rounded-lg flex items-center justify-center shrink-0 text-xs font-black text-white"
                    style={{ background: avatarColor(b.recipientName) }}
                  >
                    {initials(b.recipientName.split(" ")[0] ?? "", b.recipientName.split(" ")[1] ?? "")}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-white truncate">
                      {b.nickname || b.recipientName}
                    </p>
                    <p className="text-xs text-white/40 truncate">
                      {b.bankName} · ••{b.accountNumber.slice(-4)}
                    </p>
                  </div>
                  <ChevronRight className="size-4 text-white/25 ml-auto shrink-0" />
                </button>
                <button
                  onClick={() => onDelete(b.id)}
                  disabled={deletingId === b.id}
                  className="size-9 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center text-white/25 hover:text-red-400 hover:border-red-400/30 transition shrink-0 disabled:opacity-40"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {hasRecent && (
        <>
          <p className="text-[11px] font-black uppercase tracking-wider text-white/35 mb-2.5 flex items-center gap-1.5">
            <Clock className="size-3" /> Recent
          </p>
          <div className="flex gap-3 overflow-x-auto scrollbar-none pb-1 mb-2">
            {recentRecipients.map((r) => (
              <button
                key={r.name + r.accountNumber}
                onClick={() => onPick(r)}
                className="flex flex-col items-center gap-1.5 shrink-0 opacity-70 hover:opacity-100 transition"
              >
                <div
                  className="size-11 rounded-full flex items-center justify-center text-white text-xs font-black"
                  style={{ background: avatarColor(r.name) }}
                >
                  {initials(r.name.split(" ")[0] ?? "", r.name.split(" ")[1] ?? "")}
                </div>
                <span className="text-[11px] font-semibold text-white/45 whitespace-nowrap max-w-[52px] truncate">
                  {r.name.split(" ")[0]}
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Divider */}
      <div className="flex items-center gap-3 mt-3 mb-5">
        <div className="flex-1 h-px bg-white/8" />
        <span className="text-[11px] text-white/30 font-semibold">or enter new details</span>
        <div className="flex-1 h-px bg-white/8" />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Main export
═══════════════════════════════════════════════════════════════════════════ */

export function TransferFlow({
  accounts, settings, savedBeneficiaries, recentRecipients,
}: {
  accounts: Account[];
  settings: TransferSettings;
  savedBeneficiaries: SavedBeneficiary[];
  recentRecipients: RecentRecipient[];
}) {
  /* ── Wizard navigation ──────────────────────────────────────────────── */
  const [step, setStep] = useState<WizardStep>(1);
  const [slideDir, setSlideDir] = useState<"fwd" | "back">("fwd");
  const [animKey, setAnimKey] = useState(0);
  const [showResult, setShowResult] = useState(false);

  function go(target: WizardStep, dir: "fwd" | "back") {
    setSlideDir(dir);
    setAnimKey((k) => k + 1);
    setStep(target);
  }

  /* ── Form state — Step 1: Recipient ────────────────────────────────── */
  const [recipientName, setRecipientName] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [routingSwift, setRoutingSwift] = useState("");
  const [recipientCountry, setRecipientCountry] = useState("United States");
  const [currency, setCurrency] = useState("USD");
  const [saveBeneficiary, setSaveBeneficiary] = useState(false);
  const [beneficiaryNickname, setBeneficiaryNickname] = useState("");

  /* ── Form state — Step 2: Options ──────────────────────────────────── */
  const [fromAccountId, setFromAccountId] = useState(accounts[0]?.id ?? "");
  const [transferType, setTransferType] = useState<"DOMESTIC" | "INTERNATIONAL" | "INTERNAL">("DOMESTIC");
  const [transferMethod, setTransferMethod] = useState<"BANK" | "CRYPTO">("BANK");
  const [purpose, setPurpose] = useState("");

  /* ── Form state — Step 3: Amount ───────────────────────────────────── */
  const [amount, setAmount] = useState("0");

  /* ── UI state ───────────────────────────────────────────────────────── */
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<TransferResult | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [beneficiaries, setBeneficiaries] = useState<SavedBeneficiary[]>(savedBeneficiaries);

  /* ── Derived ────────────────────────────────────────────────────────── */
  const numericAmount = parseFloat(amount.replace(/,/g, "")) || 0;
  const fromAccount = accounts.find((a) => a.id === fromAccountId);
  const insufficientFunds =
    Boolean(fromAccount && numericAmount > 0 && numericAmount > fromAccount.availableBalance);

  /* ── Keypad ─────────────────────────────────────────────────────────── */
  function pressKey(key: string) {
    setAmount((prev) => {
      const clean = prev.replace(/,/g, "");
      if (key === "del") {
        const next = clean.slice(0, -1) || "0";
        return fmt(next);
      }
      if (key === ".") return clean.includes(".") ? prev : clean + ".";
      const next = clean === "0" ? key : clean + key;
      return fmt(next);
    });
  }
  function fmt(v: string) {
    if (v.includes(".")) {
      const [int, dec] = v.split(".");
      return Number(int).toLocaleString("en-US") + "." + dec.slice(0, 2);
    }
    return Number(v).toLocaleString("en-US");
  }

  /* ── Fill from saved / recent ───────────────────────────────────────── */
  function fillFrom(b: SavedBeneficiary | RecentRecipient) {
    const name = "recipientName" in b ? b.recipientName : b.name;
    setRecipientName(name);
    setBankName(b.bankName);
    setAccountNumber(b.accountNumber);
    setRoutingSwift(b.routingSwift ?? "");
    setRecipientCountry(b.recipientCountry || "United States");
    setCurrency(b.currency || "USD");
    setErrors({});
    // Jump straight to Step 2 when picking a saved recipient
    go(2, "fwd");
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

  /* ── Step-level validation ──────────────────────────────────────────── */
  function validateStep1(): FieldErrors {
    const e: FieldErrors = {};
    if (!recipientName.trim() || recipientName.trim().length < 2)
      e.recipientName = "Recipient full name is required";
    if (!bankName.trim()) e.bankName = "Bank name is required";
    if (!accountNumber.trim() || accountNumber.trim().length < 4)
      e.accountNumber = "Account number / IBAN required (min 4 chars)";
    if (!recipientCountry) e.recipientCountry = "Country is required";
    return e;
  }
  function validateStep2(): FieldErrors {
    const e: FieldErrors = {};
    if (!fromAccountId) e.fromAccountId = "Select a source account";
    if (!purpose.trim() || purpose.trim().length < 2) e.purpose = "Purpose is required";
    return e;
  }
  function validateStep3(): FieldErrors {
    const e: FieldErrors = {};
    if (numericAmount <= 0) e.amount = "Enter an amount greater than 0";
    if (insufficientFunds)
      e.amount = `Insufficient funds — available ${formatCurrency(fromAccount?.availableBalance ?? 0, fromAccount?.currency)}`;
    return e;
  }

  function nextStep1() {
    const e = validateStep1();
    setErrors(e);
    if (!Object.keys(e).length) go(2, "fwd");
  }
  function nextStep2() {
    const e = validateStep2();
    setErrors(e);
    if (!Object.keys(e).length) go(3, "fwd");
  }
  function nextStep3() {
    const e = validateStep3();
    setErrors(e);
    if (!Object.keys(e).length) go(4, "fwd");
  }

  /* ── Submit ──────────────────────────────────────────────────────────── */
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
        setBeneficiaries((prev) => [
          {
            id: data.transfer?.id ?? String(Date.now()),
            nickname: beneficiaryNickname.trim() || null,
            recipientName: recipientName.trim(),
            bankName: bankName.trim(),
            accountNumber: accountNumber.trim(),
            routingSwift: routingSwift.trim(),
            recipientCountry,
            currency,
          },
          ...prev,
        ]);
      }

      const reviewMessage = data.message?.reviewMessage ?? settings.reviewMessage;
      setResult({
        state: "review",
        message: reviewMessage,
        amount: numericAmount,
        beneficiary: recipientName.trim(),
        reference: data.message?.reference ?? data.transfer?.id ?? "Pending",
        reason: data.message?.reasonText ?? settings.reasonText ?? reviewMessage,
      });
      setShowResult(true);
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
      setShowResult(true);
    } finally {
      setSubmitting(false);
    }
  }

  function resetFlow() {
    setAmount("0");
    setRecipientName(""); setBankName(""); setAccountNumber("");
    setRoutingSwift(""); setRecipientCountry("United States");
    setCurrency("USD"); setPurpose(""); setSaveBeneficiary(false);
    setBeneficiaryNickname(""); setErrors({}); setResult(null);
    setShowResult(false);
    setSlideDir("back"); setAnimKey((k) => k + 1); setStep(1);
  }

  /* ── Slide style ─────────────────────────────────────────────────────── */
  const slide: React.CSSProperties = {
    animation: `${slideDir === "fwd" ? "tfFwd" : "tfBack"} 0.22s ease both`,
  };

  /* ═══════════════════════════════════════════════════════════════════
     RESULT SCREEN
  ════════════════════════════════════════════════════════════════════ */
  if (showResult) {
    const isOk = result?.state !== "failed";
    const Icon = isOk ? Check : AlertTriangle;
    const supportMsg = result
      ? `Transfer of ${formatCurrency(result.amount)} to ${result.beneficiary} — ${result.reason}\nRef: ${result.reference}`
      : "";

    return (
      <>
        <style>{`
          @keyframes tfFwd  { from { opacity:0; transform:translateX(20px)  } to { opacity:1; transform:translateX(0) } }
          @keyframes tfBack { from { opacity:0; transform:translateX(-20px) } to { opacity:1; transform:translateX(0) } }
        `}</style>
        <div key={`result-${animKey}`} style={slide} className="card-dark p-6 text-center mb-20 lg:mb-6">
          <div className={`size-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isOk ? "bg-emerald-400/15" : "bg-red-500/15"}`}>
            <Icon className={`size-8 ${isOk ? "text-emerald-400" : "text-red-300"}`} />
          </div>
          <h2 className="text-xl font-black text-white">
            {isOk ? "Transfer Under Review" : "Transfer Not Submitted"}
          </h2>
          <p className="text-sm text-white/50 mt-1.5 leading-relaxed">{result?.message}</p>
          {settings.supportInstructions && (
            <p className="mt-1 text-xs text-white/30">{settings.supportInstructions}</p>
          )}

          <div className="mt-5 bg-white/5 rounded-2xl p-4 text-left space-y-2">
            {(
              [
                ["Amount", formatCurrency(result?.amount ?? 0)],
                ["To", result?.beneficiary ?? ""],
                ["Currency", currency],
                ["Type", transferType === "INTERNATIONAL" ? "International" : transferType === "INTERNAL" ? "Same Bank" : "Domestic"],
                ["Reference", result?.reference ?? "Pending"],
                ["Status", isOk ? "Under Review" : "Failed"],
              ] as [string, string][]
            ).map(([label, val]) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-white/40">{label}</span>
                <span className={`font-bold ${label === "Status" ? (isOk ? "text-emerald-400" : "text-red-300") : "text-white"}`}>{val}</span>
              </div>
            ))}
          </div>

          <Link
            href={`/support?message=${encodeURIComponent(supportMsg)}`}
            className="mt-5 block w-full bg-white/8 border border-white/12 text-white font-black py-3.5 rounded-2xl hover:bg-white/14 transition text-sm"
          >
            {settings.buttonText || "Contact Support"}
          </Link>
          <button
            onClick={resetFlow}
            className="mt-2.5 w-full bg-emerald-500 text-black font-black py-3.5 rounded-2xl hover:bg-emerald-400 transition text-sm"
          >
            New Transfer
          </button>
        </div>
      </>
    );
  }

  /* ═══════════════════════════════════════════════════════════════════
     WIZARD STEPS
  ════════════════════════════════════════════════════════════════════ */
  return (
    <>
      <style>{`
        @keyframes tfFwd  { from { opacity:0; transform:translateX(20px)  } to { opacity:1; transform:translateX(0) } }
        @keyframes tfBack { from { opacity:0; transform:translateX(-20px) } to { opacity:1; transform:translateX(0) } }
      `}</style>

      <div key={animKey} style={slide} className="card-dark p-5 mb-20 lg:mb-6">

        {/* ── STEP 1 — Recipient Details ─────────────────────────────────── */}
        {step === 1 && (
          <>
            <StepHeader step={1} />
            <h2 className="text-lg font-black text-white mb-0.5">Recipient Details</h2>
            <p className="text-xs text-white/40 mb-5">Who are you sending money to?</p>

            {/* Quick-pick saved / recent */}
            <RecipientStrip
              beneficiaries={beneficiaries}
              recentRecipients={recentRecipients}
              onPick={fillFrom}
              onDelete={deleteBeneficiary}
              deletingId={deletingId}
            />

            {/* Form */}
            <div className="space-y-3">
              <div>
                <FL>Recipient full name</FL>
                <TextInput
                  value={recipientName} onChange={setRecipientName}
                  placeholder="e.g. Jane Smith"
                  icon={<User className="size-4" />}
                />
                <FE msg={errors.recipientName} />
              </div>

              <div>
                <FL>Bank name</FL>
                <TextInput
                  value={bankName} onChange={setBankName}
                  placeholder="e.g. Chase Bank"
                  icon={<Building2 className="size-4" />}
                />
                <FE msg={errors.bankName} />
              </div>

              <div>
                <FL>Account number / IBAN</FL>
                <TextInput
                  value={accountNumber} onChange={setAccountNumber}
                  placeholder="Account number or IBAN"
                  icon={<CreditCard className="size-4" />}
                  mono
                />
                <FE msg={errors.accountNumber} />
              </div>

              <div>
                <FL>Routing / SWIFT / BIC / Sort Code <span className="normal-case font-normal text-white/25">(optional)</span></FL>
                <TextInput
                  value={routingSwift} onChange={setRoutingSwift}
                  placeholder="e.g. CHASUS33 or 021000021"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FL>Country</FL>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/30 pointer-events-none z-10" />
                    <select
                      value={recipientCountry} onChange={(e) => setRecipientCountry(e.target.value)}
                      className="w-full bg-white/6 border border-white/10 rounded-xl pl-10 pr-3 py-3 text-sm text-white outline-none focus:border-emerald-400/50 transition appearance-none"
                      style={{ colorScheme: "dark" }}
                    >
                      {COUNTRIES.map((c) => (
                        <option key={c} value={c} className="bg-[#161c28]">{c}</option>
                      ))}
                    </select>
                  </div>
                  <FE msg={errors.recipientCountry} />
                </div>
                <div>
                  <FL>Currency</FL>
                  <SelectInput value={currency} onChange={setCurrency} options={CURRENCIES} />
                </div>
              </div>

              {/* Save as beneficiary */}
              <label className="flex items-start gap-3 cursor-pointer group pt-1">
                <div
                  onClick={() => setSaveBeneficiary((v) => !v)}
                  className={`mt-0.5 size-5 rounded-md border-2 flex items-center justify-center shrink-0 transition ${saveBeneficiary ? "bg-emerald-400 border-emerald-400" : "border-white/20 group-hover:border-white/40"}`}
                >
                  {saveBeneficiary && <Check className="size-3 text-black" />}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Save as beneficiary</p>
                  <p className="text-xs text-white/35">Quick-fill this recipient next time</p>
                </div>
              </label>
              {saveBeneficiary && (
                <div className="ml-8">
                  <FL>Nickname <span className="normal-case font-normal text-white/25">(optional)</span></FL>
                  <TextInput
                    value={beneficiaryNickname} onChange={setBeneficiaryNickname}
                    placeholder="e.g. Mom, Landlord"
                  />
                </div>
              )}
            </div>

            <button
              onClick={nextStep1}
              className="mt-5 w-full bg-emerald-500 text-black font-black py-4 rounded-2xl hover:bg-emerald-400 transition flex items-center justify-center gap-2 text-sm"
            >
              Next — Transfer Options
              <ChevronRight className="size-5" />
            </button>
          </>
        )}

        {/* ── STEP 2 — Transfer Options ──────────────────────────────────── */}
        {step === 2 && (
          <>
            <StepHeader step={2} onBack={() => go(1, "back")} />
            <h2 className="text-lg font-black text-white mb-0.5">Transfer Options</h2>
            <p className="text-xs text-white/40 mb-5">
              Sending to <span className="text-white font-semibold">{recipientName}</span>
            </p>

            <div className="space-y-4">
              {/* Transfer method: Bank vs Crypto */}
              <div>
                <FL>Transfer method</FL>
                <div className="grid grid-cols-2 gap-2">
                  {(["BANK", "CRYPTO"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setTransferMethod(m)}
                      className={`flex items-center gap-2.5 rounded-xl px-4 py-3 border text-sm font-bold transition ${transferMethod === m ? "bg-emerald-400/12 border-emerald-400/40 text-emerald-300" : "bg-white/5 border-white/8 text-white/50 hover:bg-white/8 hover:text-white"}`}
                    >
                      {m === "BANK"
                        ? <Building2 className="size-4 shrink-0" />
                        : <Wallet className="size-4 shrink-0" />
                      }
                      {m === "BANK" ? "Bank Transfer" : "Crypto Transfer"}
                    </button>
                  ))}
                </div>

                {/* Crypto redirect notice */}
                {transferMethod === "CRYPTO" && (
                  <div className="mt-3 bg-amber-400/8 border border-amber-400/20 rounded-xl px-4 py-3">
                    <p className="text-xs font-semibold text-amber-300 mb-1">Crypto transfers use your Wallet</p>
                    <p className="text-xs text-white/50 mb-2.5">
                      To send cryptocurrency, go to your Crypto Wallet and follow the deposit or send instructions there.
                    </p>
                    <Link
                      href="/wallet"
                      className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-400 hover:text-emerald-300 transition"
                    >
                      Go to Crypto Wallet <ArrowRight className="size-3.5" />
                    </Link>
                  </div>
                )}
              </div>

              {/* Bank transfer options — only shown when BANK is selected */}
              {transferMethod === "BANK" && (
                <>
                  {/* From account */}
                  <div>
                    <FL>From account</FL>
                    <div className="space-y-2">
                      {accounts.map((a) => (
                        <button
                          key={a.id}
                          onClick={() => setFromAccountId(a.id)}
                          className={`w-full flex items-center justify-between rounded-xl px-4 py-3 border text-left transition ${fromAccountId === a.id ? "bg-emerald-400/10 border-emerald-400/30" : "bg-white/5 border-white/8 hover:bg-white/8"}`}
                        >
                          <span>
                            <span className="block text-sm font-black text-white">
                              {accountLabel(a.type)} •••• {a.accountNumber.slice(-4)}
                            </span>
                            <span className="block text-xs text-white/40">
                              {formatCurrency(a.availableBalance, a.currency)} available
                            </span>
                          </span>
                          {fromAccountId === a.id
                            ? <Check className="size-4 text-emerald-400 shrink-0" />
                            : <ChevronRight className="size-4 text-white/25 shrink-0" />
                          }
                        </button>
                      ))}
                    </div>
                    <FE msg={errors.fromAccountId} />
                  </div>

                  {/* Transfer type */}
                  <div>
                    <FL>Transfer type</FL>
                    <div className="flex gap-2">
                      {(["DOMESTIC", "INTERNATIONAL", "INTERNAL"] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() => setTransferType(t)}
                          className={`flex-1 py-2.5 rounded-xl text-xs font-black border transition ${transferType === t ? "bg-emerald-400/12 border-emerald-400/40 text-emerald-300" : "bg-white/5 border-white/8 text-white/45 hover:text-white hover:bg-white/8"}`}
                        >
                          {t === "INTERNAL" ? "Same Bank" : t === "INTERNATIONAL" ? "Intl." : "Domestic"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Purpose */}
                  <div>
                    <FL>Transfer purpose / note</FL>
                    <TextInput
                      value={purpose} onChange={setPurpose}
                      placeholder="e.g. Invoice payment, Rent, Family support"
                    />
                    <FE msg={errors.purpose} />
                  </div>
                </>
              )}
            </div>

            {transferMethod === "BANK" && (
              <button
                onClick={nextStep2}
                className="mt-5 w-full bg-emerald-500 text-black font-black py-4 rounded-2xl hover:bg-emerald-400 transition flex items-center justify-center gap-2 text-sm"
              >
                Next — Enter Amount
                <ChevronRight className="size-5" />
              </button>
            )}
          </>
        )}

        {/* ── STEP 3 — Amount ────────────────────────────────────────────── */}
        {step === 3 && (
          <>
            <StepHeader step={3} onBack={() => go(2, "back")} />
            <h2 className="text-lg font-black text-white mb-0.5">Enter Amount</h2>
            <p className="text-xs text-white/40 mb-5">
              {currency} · to <span className="text-white font-semibold">{recipientName}</span>
            </p>

            {/* Amount display */}
            <div className="bg-white/5 border border-white/8 rounded-2xl px-5 py-5 mb-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-white/30 mb-0.5 uppercase tracking-wider">{currency}</p>
                <p className="text-4xl font-black text-white tracking-tight">
                  {currency === "USD" ? "$" : currency === "EUR" ? "€" : currency === "GBP" ? "£" : ""}
                  {amount}
                </p>
              </div>
              <button
                onClick={() => setAmount("0")}
                className="size-8 rounded-full bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Balance strip */}
            {fromAccount && (
              <div className={`flex items-center gap-2 rounded-xl px-4 py-2.5 mb-3 ${insufficientFunds ? "bg-red-500/10 border border-red-300/20" : "bg-white/4 border border-white/8"}`}>
                <ShieldCheck className={`size-4 shrink-0 ${insufficientFunds ? "text-red-300" : "text-emerald-400"}`} />
                <p className="text-xs text-white/55">
                  {insufficientFunds
                    ? `Insufficient — available ${formatCurrency(fromAccount.availableBalance, fromAccount.currency)}`
                    : `${accountLabel(fromAccount.type)} ••${fromAccount.accountNumber.slice(-4)} — ${formatCurrency(fromAccount.availableBalance, fromAccount.currency)} available`
                  }
                </p>
              </div>
            )}
            <FE msg={errors.amount} />

            {/* Keypad */}
            <div className="grid grid-cols-3 gap-2.5 my-4">
              {["1","2","3","4","5","6","7","8","9",".","0","del"].map((k) => (
                <button
                  key={k}
                  onClick={() => pressKey(k)}
                  className="h-14 rounded-2xl bg-white/6 border border-white/8 text-white font-black text-xl hover:bg-white/10 active:scale-95 transition flex items-center justify-center"
                >
                  {k === "del" ? <Delete className="size-5" /> : k}
                </button>
              ))}
            </div>

            <button
              onClick={nextStep3}
              className="w-full bg-emerald-500 text-black font-black py-4 rounded-2xl hover:bg-emerald-400 transition flex items-center justify-center gap-2 text-sm"
            >
              Review Transfer
              <ChevronRight className="size-5" />
            </button>
          </>
        )}

        {/* ── STEP 4 — Confirm ───────────────────────────────────────────── */}
        {step === 4 && (
          <>
            <StepHeader step={4} onBack={() => go(3, "back")} />
            <h2 className="text-lg font-black text-white mb-0.5">Confirm Transfer</h2>
            <p className="text-xs text-white/40 mb-5">Review everything before submitting.</p>

            {/* Amount hero */}
            <div className="text-center bg-white/5 border border-white/8 rounded-2xl py-6 mb-5">
              <p className="text-xs font-bold text-white/30 mb-1 uppercase tracking-wider">You&apos;re sending</p>
              <p className="text-4xl font-black text-white">{formatCurrency(numericAmount, currency)}</p>
              <p className="text-sm text-white/40 mt-1.5">
                {currency} ·{" "}
                {transferType === "INTERNATIONAL" ? "International" : transferType === "INTERNAL" ? "Same Bank" : "Domestic"}
              </p>
            </div>

            {/* Summary rows */}
            <div className="space-y-2 mb-5">
              {/* Recipient section header */}
              <p className="text-[11px] font-black uppercase tracking-wider text-white/30 pt-1">Recipient</p>
              {(
                [
                  ["Name", recipientName],
                  ["Bank", bankName],
                  ["Account / IBAN", accountNumber],
                  ...(routingSwift ? [["SWIFT / Routing", routingSwift] as [string, string]] : []),
                  ["Country", recipientCountry],
                ] as [string, string][]
              ).map(([label, val]) => (
                <div key={label} className="flex items-start justify-between bg-white/4 rounded-xl px-3.5 py-2.5 gap-3">
                  <span className="text-white/40 text-xs shrink-0">{label}</span>
                  <span className="font-semibold text-white text-xs text-right break-all">{val}</span>
                </div>
              ))}

              <p className="text-[11px] font-black uppercase tracking-wider text-white/30 pt-2">Transfer</p>
              {(
                [
                  ["From", fromAccount ? `${accountLabel(fromAccount.type)} •••• ${fromAccount.accountNumber.slice(-4)}` : ""],
                  ["Type", transferType === "INTERNATIONAL" ? "International" : transferType === "INTERNAL" ? "Same Bank" : "Domestic"],
                  ["Purpose", purpose],
                  ["Fee", "None"],
                ] as [string, string][]
              ).map(([label, val]) => (
                <div key={label} className="flex items-start justify-between bg-white/4 rounded-xl px-3.5 py-2.5 gap-3">
                  <span className="text-white/40 text-xs shrink-0">{label}</span>
                  <span className={`font-semibold text-xs text-right ${label === "Fee" ? "text-emerald-400" : "text-white"}`}>
                    {val}
                  </span>
                </div>
              ))}

              {saveBeneficiary && (
                <div className="flex items-center gap-2 bg-emerald-400/8 border border-emerald-400/20 rounded-xl px-3.5 py-2.5">
                  <Bookmark className="size-3.5 text-emerald-400 shrink-0" />
                  <span className="text-xs text-white/55">
                    Saved as {beneficiaryNickname ? `"${beneficiaryNickname}"` : "a beneficiary"}
                  </span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => go(1, "back")}
                className="flex-1 bg-white/7 border border-white/10 text-white font-bold py-3.5 rounded-2xl hover:bg-white/12 transition text-sm"
              >
                Edit
              </button>
              <button
                onClick={submit}
                disabled={submitting}
                className="flex-1 bg-emerald-500 text-black font-black py-3.5 rounded-2xl hover:bg-emerald-400 transition disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
              >
                <Send className="size-4" />
                {submitting ? "Submitting…" : "Confirm Transfer"}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
