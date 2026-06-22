"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ChevronLeft, ChevronRight, Building2, ShieldCheck, Delete, Check,
  AlertTriangle, User, CreditCard, Globe, Bookmark, Clock, X, Send,
  ArrowRight, Wallet, MapPin, Hash,
} from "lucide-react";
import { secureFetch } from "@/lib/client-api";
import { useTranslations } from "@/lib/i18n/use-translations";
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
type TransferType = "DOMESTIC" | "INTERNATIONAL" | "INTERNAL";
// Steps: 1=Type, 2=Recipient, 3=Options, 4=Amount, 5=Confirm
type WizardStep = 1 | 2 | 3 | 4 | 5;

/* ─── Constants ──────────────────────────────────────────────────────────── */

const CURRENCIES = [
  "USD","EUR","GBP","CAD","AUD","JPY","CHF","CNY","HKD","SGD","MXN","BRL","NGN","INR","ZAR",
  "KRW","TRY","RUB","SEK","NOK","DKK","PLN","THB","MYR","PHP","IDR","AED","EGP","KES","GHS",
];
const COUNTRIES = [
  "United States","United Kingdom","Canada","Australia","Germany","France",
  "Netherlands","Switzerland","Japan","China","Hong Kong","Singapore",
  "Mexico","Brazil","Nigeria","India","South Africa","United Arab Emirates",
  "Ghana","Kenya","South Korea","Turkey","Indonesia","Malaysia","Philippines",
  "Thailand","Vietnam","Egypt","Pakistan","Bangladesh","Saudi Arabia",
  "New Zealand","Spain","Italy","Sweden","Norway","Denmark","Belgium",
  "Portugal","Ireland","Austria","Poland","Czech Republic","Romania","Ukraine",
  "Israel","Morocco","Ethiopia","Tanzania","Uganda","Rwanda","Other",
];
const AVATAR_PALETTE = [
  "#3b82f6","#8b5cf6","#ec4899","#f59e0b","#10b981","#06b6d4","#f97316","#84cc16",
];
const STEP_LABELS: Record<WizardStep, string> = {
  1: "Type", 2: "Recipient", 3: "Options", 4: "Amount", 5: "Confirm",
};
const TOTAL_STEPS = 5;

/* ─── Helpers ────────────────────────────────────────────────────────────── */

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

/* ─── Step Progress Header ───────────────────────────────────────────────── */

function StepHeader({ step, onBack }: { step: WizardStep; onBack?: () => void }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <button
        onClick={onBack}
        disabled={!onBack}
        className="size-9 rounded-xl bg-white/6 border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition disabled:opacity-0 disabled:pointer-events-none shrink-0"
      >
        <ChevronLeft className="size-5" />
      </button>

      <div className="flex-1 flex items-center gap-1">
        {([1, 2, 3, 4, 5] as WizardStep[]).map((n) => (
          <div
            key={n}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              n < step ? "bg-emerald-400" : n === step ? "bg-emerald-400/60" : "bg-white/10"
            }`}
          />
        ))}
      </div>

      <span className="text-[11px] font-black text-white/35 shrink-0 tabular-nums">
        {step} / {TOTAL_STEPS}
      </span>
    </div>
  );
}

/* ─── Quick-pick recipients ──────────────────────────────────────────────── */

function RecipientStrip({
  beneficiaries, recentRecipients, onPick, onDelete, deletingId,
}: {
  beneficiaries: SavedBeneficiary[];
  recentRecipients: RecentRecipient[];
  onPick: (b: SavedBeneficiary | RecentRecipient) => void;
  onDelete: (id: string) => void;
  deletingId: string | null;
}) {
  const { tx } = useTranslations();
  const hasSaved = beneficiaries.length > 0;
  const hasRecent = recentRecipients.length > 0;
  if (!hasSaved && !hasRecent) return null;

  return (
    <div className="mb-5">
      {hasSaved && (
        <>
          <p className="text-[11px] font-black uppercase tracking-wider text-white/35 mb-2.5 flex items-center gap-1.5">
            <Bookmark className="size-3" /> {tx.transfer_saved_label}
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
            <Clock className="size-3" /> {tx.transfer_recent_label}
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

      <div className="flex items-center gap-3 mt-3 mb-5">
        <div className="flex-1 h-px bg-white/8" />
        <span className="text-[11px] text-white/30 font-semibold">{tx.transfer_or_new}</span>
        <div className="flex-1 h-px bg-white/8" />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Main TransferFlow component
═══════════════════════════════════════════════════════════════════════════ */

export function TransferFlow({
  accounts, settings, savedBeneficiaries, recentRecipients,
}: {
  accounts: Account[];
  settings: TransferSettings;
  savedBeneficiaries: SavedBeneficiary[];
  recentRecipients: RecentRecipient[];
}) {
  const { tx } = useTranslations();

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

  /* ── Form state ─────────────────────────────────────────────────────── */

  // Step 1: Transfer type
  const [transferType, setTransferType] = useState<TransferType>("DOMESTIC");
  const [transferMethod, setTransferMethod] = useState<"BANK" | "CRYPTO">("BANK");

  // Step 2: Recipient details (vary by transfer type)
  const [recipientName, setRecipientName] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [routingNumber, setRoutingNumber] = useState("");   // domestic routing
  const [swiftBic, setSwiftBic] = useState("");             // international SWIFT
  const [iban, setIban] = useState("");                      // international IBAN
  const [recipientAddress, setRecipientAddress] = useState(""); // international address
  const [recipientCountry, setRecipientCountry] = useState("United States");
  const [currency, setCurrency] = useState(accounts[0]?.currency ?? "USD");
  const [saveBeneficiary, setSaveBeneficiary] = useState(false);
  const [beneficiaryNickname, setBeneficiaryNickname] = useState("");

  // Step 3: Transfer options
  const [fromAccountId, setFromAccountId] = useState(accounts[0]?.id ?? "");
  const [purpose, setPurpose] = useState("");

  // Step 4: Amount — stored as a RAW numeric string (no commas, no formatting)
  // so parseFloat is always reliable regardless of locale/device
  const [rawAmount, setRawAmount] = useState("0");

  // UI state
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<TransferResult | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [beneficiaries, setBeneficiaries] = useState<SavedBeneficiary[]>(savedBeneficiaries);

  /* ── Derived ────────────────────────────────────────────────────────── */
  // numericAmount is always a clean JS number — no string parsing tricks needed
  const numericAmount = parseFloat(rawAmount) || 0;
  const fromAccount = accounts.find((a) => a.id === fromAccountId);
  // availableBalance is a Prisma Float (JS number) — compare directly, never as string
  const availableBalance = Number(fromAccount?.availableBalance ?? 0);
  const insufficientFunds = Boolean(fromAccount && numericAmount > 0 && numericAmount > availableBalance);
  const isIntl = transferType === "INTERNATIONAL";
  const isDomestic = transferType === "DOMESTIC";

  // Display-only formatted amount string (for the keypad display)
  const displayAmount = (() => {
    if (rawAmount === "0" || rawAmount === "") return "0";
    if (rawAmount.endsWith(".")) return rawAmount; // user mid-typing decimal
    const n = parseFloat(rawAmount);
    if (!Number.isFinite(n)) return "0";
    const [intPart, decPart] = rawAmount.split(".");
    const formattedInt = parseInt(intPart, 10).toLocaleString("en-US");
    return decPart !== undefined ? `${formattedInt}.${decPart.slice(0, 2)}` : formattedInt;
  })();

  /* ── Keypad ─────────────────────────────────────────────────────────── */
  function pressKey(key: string) {
    setRawAmount((prev) => {
      if (key === "del") return prev.length <= 1 ? "0" : prev.slice(0, -1);
      if (key === ".") return prev.includes(".") ? prev : prev + ".";
      if (prev === "0") return key;
      // Limit to 2 decimal places
      if (prev.includes(".")) {
        const dec = prev.split(".")[1] ?? "";
        if (dec.length >= 2) return prev;
      }
      return prev + key;
    });
  }

  /* ── Auto-sync currency when source account changes ─────────────────── */
  function selectFromAccount(accountId: string) {
    setFromAccountId(accountId);
    const acct = accounts.find((a) => a.id === accountId);
    if (acct) setCurrency(acct.currency);
  }

  /* ── Fill from saved / recent ───────────────────────────────────────── */
  function fillFrom(b: SavedBeneficiary | RecentRecipient) {
    const name = "recipientName" in b ? b.recipientName : b.name;
    setRecipientName(name);
    setBankName(b.bankName);
    setAccountNumber(b.accountNumber);
    const rs = b.routingSwift ?? "";
    // Heuristic: SWIFT is 8 or 11 alphanumeric chars; routing is 9 digits
    if (/^\d{9}$/.test(rs)) { setRoutingNumber(rs); setSwiftBic(""); }
    else { setSwiftBic(rs); setRoutingNumber(""); }
    setRecipientCountry(b.recipientCountry || "United States");
    // Only set currency from beneficiary if it matches one of the user's accounts;
    // otherwise default to the current source account's currency.
    const benefCurrency = b.currency || fromAccount?.currency || "USD";
    setCurrency(benefCurrency);
    setErrors({});
    go(3, "fwd"); // jump to options
  }

  async function deleteBeneficiary(id: string) {
    setDeletingId(id);
    try {
      await secureFetch("/api/beneficiaries", { method: "DELETE", body: JSON.stringify({ id }) });
      setBeneficiaries((prev) => prev.filter((b) => b.id !== id));
    } catch { /* non-fatal */ }
    setDeletingId(null);
  }

  /* ── Validation ─────────────────────────────────────────────────────── */
  function validateStep2(): FieldErrors {
    const e: FieldErrors = {};
    if (!recipientName.trim() || recipientName.trim().length < 2)
      e.recipientName = "Recipient full name is required";
    if (!bankName.trim()) e.bankName = "Bank name is required";
    if (!accountNumber.trim() || accountNumber.trim().length < 4)
      e.accountNumber = isIntl ? "Account number or IBAN is required (min 4 chars)" : "Account number is required (min 4 chars)";
    if (!recipientCountry) e.recipientCountry = "Country is required";
    if (isIntl && !currency) e.currency = "Currency is required";
    return e;
  }
  function validateStep3(): FieldErrors {
    const e: FieldErrors = {};
    if (!fromAccountId) e.fromAccountId = "Select a source account";
    if (!purpose.trim() || purpose.trim().length < 2) e.purpose = "Purpose is required";
    return e;
  }
  function validateStep4(): FieldErrors {
    const e: FieldErrors = {};
    if (numericAmount <= 0) e.amount = "Enter an amount greater than 0";
    if (!Number.isFinite(numericAmount)) e.amount = "Enter a valid amount";
    if (fromAccount && currency !== fromAccount.currency)
      e.amount = `Your account is in ${fromAccount.currency} but transfer currency is ${currency}. They must match.`;
    else if (insufficientFunds)
      e.amount = `Insufficient funds — available ${formatCurrency(availableBalance, fromAccount?.currency ?? currency)}`;
    return e;
  }

  function nextStep1() {
    // Step 1 validation: just need a type selected (always true) and method
    if (transferMethod === "CRYPTO") return; // handled by notice
    go(2, "fwd");
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
  function nextStep4() {
    const e = validateStep4();
    setErrors(e);
    if (!Object.keys(e).length) go(5, "fwd");
  }

  /* ── Submit ──────────────────────────────────────────────────────────── */
  async function submit() {
    setSubmitting(true);
    try {
      // Consolidate routing / swift into the ibanSwift field the API expects
      const ibanSwift = isIntl
        ? (swiftBic.trim() || iban.trim() || undefined)
        : (routingNumber.trim() || undefined);

      const data = await secureFetch("/api/transfers", {
        method: "POST",
        body: JSON.stringify({
          fromAccountId,
          type: transferType,
          beneficiaryName: recipientName.trim(),
          beneficiaryBank: bankName.trim(),
          beneficiaryAccount: (isIntl && iban.trim()) ? iban.trim() : accountNumber.trim(),
          ibanSwift,
          recipientCountry,
          amount: numericAmount,
          currency,
          purpose: purpose.trim(),
          saveBeneficiary,
          beneficiaryNickname: beneficiaryNickname.trim() || undefined,
          recipientAddress: recipientAddress.trim() || undefined,
        }),
      });

      if (saveBeneficiary) {
        const rs = isIntl ? (swiftBic.trim() || iban.trim()) : routingNumber.trim();
        setBeneficiaries((prev) => [
          {
            id: data.transfer?.id ?? String(Date.now()),
            nickname: beneficiaryNickname.trim() || null,
            recipientName: recipientName.trim(),
            bankName: bankName.trim(),
            accountNumber: (isIntl && iban.trim()) ? iban.trim() : accountNumber.trim(),
            routingSwift: rs,
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
    setRawAmount("0"); setRecipientName(""); setBankName(""); setAccountNumber("");
    setRoutingNumber(""); setSwiftBic(""); setIban(""); setRecipientAddress("");
    setRecipientCountry("United States");
    setCurrency(accounts[0]?.currency ?? "USD");
    setFromAccountId(accounts[0]?.id ?? "");
    setPurpose("");
    setSaveBeneficiary(false); setBeneficiaryNickname(""); setErrors({});
    setResult(null); setShowResult(false);
    setSlideDir("back"); setAnimKey((k) => k + 1); setStep(1);
  }

  const slide: React.CSSProperties = {
    animation: `${slideDir === "fwd" ? "tfFwd" : "tfBack"} 0.22s ease both`,
  };

  /* ═══════════════════════════════════════════════════════════════════
     RESULT / CONFIRMATION SCREEN
  ════════════════════════════════════════════════════════════════════ */
  if (showResult) {
    const isOk = result?.state !== "failed";
    const Icon = isOk ? Check : AlertTriangle;
    const supportMsg = result
      ? `Transfer of ${formatCurrency(result.amount, currency)} to ${result.beneficiary} — ${result.reason}\nRef: ${result.reference}`
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
          <p className="text-[10px] font-black tracking-widest text-white/30 uppercase mb-1">{tx.transfer_result_confirmation}</p>
          <h2 className="text-xl font-black text-white">
            {isOk ? tx.transfer_under_review : tx.transfer_not_submitted}
          </h2>
          <p className="text-sm text-white/50 mt-1.5 leading-relaxed">{result?.message}</p>
          {settings.supportInstructions && (
            <p className="mt-1 text-xs text-white/30">{settings.supportInstructions}</p>
          )}

          <div className="mt-5 bg-white/5 rounded-2xl p-4 text-left space-y-2">
            {(
              [
                [tx.transfer_amount, formatCurrency(result?.amount ?? 0, currency)],
                [tx.transfer_label_to, result?.beneficiary ?? ""],
                [tx.common_currency, currency],
                [tx.common_type, transferType === "INTERNATIONAL" ? tx.transfer_international : transferType === "INTERNAL" ? tx.transfer_same_bank : tx.transfer_domestic],
                [tx.common_reference, result?.reference ?? ""],
                [tx.common_status, isOk ? tx.transfer_status_review : tx.transfer_status_failed],
              ] as [string, string][]
            ).map(([label, val]) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-white/40">{label}</span>
                <span className={`font-bold ${label === tx.common_status ? (isOk ? "text-emerald-400" : "text-red-300") : "text-white"}`}>{val}</span>
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
            {tx.transfer_new}
          </button>
        </div>
      </>
    );
  }

  /* ═══════════════════════════════════════════════════════════════════
     WIZARD
  ════════════════════════════════════════════════════════════════════ */
  return (
    <>
      <style>{`
        @keyframes tfFwd  { from { opacity:0; transform:translateX(20px)  } to { opacity:1; transform:translateX(0) } }
        @keyframes tfBack { from { opacity:0; transform:translateX(-20px) } to { opacity:1; transform:translateX(0) } }
      `}</style>

      <div key={animKey} style={slide} className="card-dark p-5 mb-20 lg:mb-6">

        {/* ─── STEP 1 — Transfer Type ────────────────────────────────────── */}
        {step === 1 && (
          <>
            <StepHeader step={1} />
            <h2 className="text-lg font-black text-white mb-0.5">{tx.transfer_step_type}</h2>
            <p className="text-xs text-white/40 mb-5">{tx.transfer_type_how_to_send}</p>

            <div className="space-y-4">
              {/* Transfer method */}
              <div>
                <FL>{tx.transfer_method}</FL>
                <div className="grid grid-cols-2 gap-2">
                  {(["BANK", "CRYPTO"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setTransferMethod(m)}
                      className={`flex items-center gap-2.5 rounded-xl px-4 py-3 border text-sm font-bold transition ${transferMethod === m ? "bg-emerald-400/12 border-emerald-400/40 text-emerald-300" : "bg-white/5 border-white/8 text-white/50 hover:bg-white/8 hover:text-white"}`}
                    >
                      {m === "BANK" ? <Building2 className="size-4 shrink-0" /> : <Wallet className="size-4 shrink-0" />}
                      {m === "BANK" ? tx.transfer_method_bank : tx.nav_crypto}
                    </button>
                  ))}
                </div>

                {transferMethod === "CRYPTO" && (
                  <div className="mt-3 bg-amber-400/8 border border-amber-400/20 rounded-xl px-4 py-3">
                    <p className="text-xs font-semibold text-amber-300 mb-1">{tx.transfer_crypto_hint_title}</p>
                    <p className="text-xs text-white/50 mb-2.5">
                      {tx.transfer_crypto_hint_body}
                    </p>
                    <Link href="/wallet" className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-400 hover:text-emerald-300 transition">
                      {tx.transfer_go_to_wallet} <ArrowRight className="size-3.5" />
                    </Link>
                  </div>
                )}
              </div>

              {transferMethod === "BANK" && (
                <div>
                  <FL>{tx.transfer_type_label}</FL>
                  <div className="space-y-2">
                    {(
                      [
                        ["DOMESTIC", tx.transfer_domestic, tx.transfer_domestic_desc],
                        ["INTERNATIONAL", tx.transfer_international_wire, tx.transfer_international_desc],
                        ["INTERNAL", tx.transfer_same_bank, tx.transfer_same_bank_desc],
                      ] as [TransferType, string, string][]
                    ).map(([type, label, desc]) => (
                      <button
                        key={type}
                        onClick={() => setTransferType(type)}
                        className={`w-full text-left flex items-start gap-3 rounded-2xl p-4 border transition ${transferType === type ? "bg-emerald-400/10 border-emerald-400/30" : "bg-white/4 border-white/8 hover:bg-white/7"}`}
                      >
                        <div className={`size-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${transferType === type ? "border-emerald-400 bg-emerald-400" : "border-white/25"}`}>
                          {transferType === type && <Check className="size-3 text-black" />}
                        </div>
                        <div>
                          <p className={`text-sm font-black ${transferType === type ? "text-white" : "text-white/70"}`}>{label}</p>
                          <p className="text-xs text-white/40 mt-0.5 leading-relaxed">{desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {transferMethod === "BANK" && (
              <button
                onClick={nextStep1}
                className="mt-5 w-full bg-emerald-500 text-black font-black py-4 rounded-2xl hover:bg-emerald-400 transition flex items-center justify-center gap-2 text-sm"
              >
                {tx.transfer_next_recipient}
                <ChevronRight className="size-5" />
              </button>
            )}
          </>
        )}

        {/* ─── STEP 2 — Recipient Details (dynamic by type) ─────────────── */}
        {step === 2 && (
          <>
            <StepHeader step={2} onBack={() => go(1, "back")} />
            <h2 className="text-lg font-black text-white mb-0.5">{tx.transfer_recipient_details}</h2>
            <p className="text-xs text-white/40 mb-1">
              {transferType === "INTERNATIONAL"
                ? tx.transfer_recipient_note_intl
                : transferType === "INTERNAL"
                ? tx.transfer_recipient_note_internal
                : tx.transfer_recipient_note_domestic}
            </p>
            <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-white/6 border border-white/10 px-3 py-1">
              <span className="text-[10px] font-black text-white/40 uppercase tracking-wider">
                {transferType === "INTERNATIONAL" ? tx.transfer_wire_label : transferType === "INTERNAL" ? tx.transfer_same_bank : tx.transfer_domestic}
              </span>
            </div>

            <RecipientStrip
              beneficiaries={beneficiaries}
              recentRecipients={recentRecipients}
              onPick={fillFrom}
              onDelete={deleteBeneficiary}
              deletingId={deletingId}
            />

            <div className="space-y-3">
              {/* COMMON: Recipient Name */}
              <div>
                <FL>{tx.transfer_recipient_name}</FL>
                <TextInput value={recipientName} onChange={setRecipientName} placeholder="e.g. Jane Smith" icon={<User className="size-4" />} />
                <FE msg={errors.recipientName} />
              </div>

              {/* COMMON: Bank Name (not for same-bank) */}
              {transferType !== "INTERNAL" && (
                <div>
                  <FL>{tx.transfer_bank_name}</FL>
                  <TextInput value={bankName} onChange={setBankName} placeholder="e.g. Chase Bank" icon={<Building2 className="size-4" />} />
                  <FE msg={errors.bankName} />
                </div>
              )}

              {/* DOMESTIC: Account Number + Routing Number */}
              {isDomestic && (
                <>
                  <div>
                    <FL>{tx.transfer_account_number}</FL>
                    <TextInput value={accountNumber} onChange={setAccountNumber} placeholder="e.g. 1234567890" icon={<CreditCard className="size-4" />} mono />
                    <FE msg={errors.accountNumber} />
                  </div>
                  <div>
                    <FL>{tx.transfer_routing_number} <span className="normal-case font-normal text-white/25">{tx.transfer_nickname_optional}</span></FL>
                    <TextInput value={routingNumber} onChange={setRoutingNumber} placeholder="e.g. 021000021" icon={<Hash className="size-4" />} mono />
                  </div>
                </>
              )}

              {/* INTERNATIONAL: IBAN + SWIFT + Address + Country + Currency */}
              {isIntl && (
                <>
                  <div>
                    <FL>{tx.transfer_iban} <span className="normal-case font-normal text-white/25">{tx.transfer_where_applicable}</span></FL>
                    <TextInput value={iban} onChange={setIban} placeholder="e.g. GB29 NWBK 6016 1331 9268 19" icon={<CreditCard className="size-4" />} mono />
                    <FE msg={errors.accountNumber} />
                  </div>
                  <div>
                    <FL>{tx.transfer_account_number} <span className="normal-case font-normal text-white/25">(if no IBAN)</span></FL>
                    <TextInput value={accountNumber} onChange={setAccountNumber} placeholder="Account number" icon={<Hash className="size-4" />} mono />
                  </div>
                  <div>
                    <FL>{tx.transfer_swift}</FL>
                    <TextInput value={swiftBic} onChange={setSwiftBic} placeholder="e.g. CHASUS33" icon={<Globe className="size-4" />} mono />
                  </div>
                  <div>
                    <FL>{tx.transfer_recipient_address} <span className="normal-case font-normal text-white/25">{tx.transfer_required_some_countries}</span></FL>
                    <TextInput value={recipientAddress} onChange={setRecipientAddress} placeholder="Street, City, Country" icon={<MapPin className="size-4" />} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <FL>{tx.transfer_country}</FL>
                      <div className="relative">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/30 pointer-events-none z-10" />
                        <select
                          value={recipientCountry} onChange={(e) => setRecipientCountry(e.target.value)}
                          className="w-full bg-white/6 border border-white/10 rounded-xl pl-10 pr-3 py-3 text-sm text-white outline-none focus:border-emerald-400/50 transition appearance-none"
                          style={{ colorScheme: "dark" }}
                        >
                          {COUNTRIES.map((c) => <option key={c} value={c} className="bg-[#161c28]">{c}</option>)}
                        </select>
                      </div>
                      <FE msg={errors.recipientCountry} />
                    </div>
                    <div>
                      <FL>{tx.transfer_currency}</FL>
                      <SelectInput value={currency} onChange={setCurrency} options={CURRENCIES} />
                      <FE msg={errors.currency} />
                    </div>
                  </div>
                </>
              )}

              {/* INTERNAL (same bank): Just account number */}
              {transferType === "INTERNAL" && (
                <div>
                  <FL>{tx.transfer_account_number}</FL>
                  <TextInput value={accountNumber} onChange={setAccountNumber} placeholder="Recipient's account number" icon={<CreditCard className="size-4" />} mono />
                  <FE msg={errors.accountNumber} />
                </div>
              )}

              {/* DOMESTIC: Country */}
              {isDomestic && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <FL>{tx.transfer_country}</FL>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/30 pointer-events-none z-10" />
                      <select
                        value={recipientCountry} onChange={(e) => setRecipientCountry(e.target.value)}
                        className="w-full bg-white/6 border border-white/10 rounded-xl pl-10 pr-3 py-3 text-sm text-white outline-none focus:border-emerald-400/50 transition appearance-none"
                        style={{ colorScheme: "dark" }}
                      >
                        {COUNTRIES.map((c) => <option key={c} value={c} className="bg-[#161c28]">{c}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <FL>{tx.transfer_currency}</FL>
                    <SelectInput value={currency} onChange={setCurrency} options={CURRENCIES} />
                  </div>
                </div>
              )}

              {/* Save as beneficiary */}
              <label className="flex items-start gap-3 cursor-pointer group pt-1">
                <div
                  onClick={() => setSaveBeneficiary((v) => !v)}
                  className={`mt-0.5 size-5 rounded-md border-2 flex items-center justify-center shrink-0 transition ${saveBeneficiary ? "bg-emerald-400 border-emerald-400" : "border-white/20 group-hover:border-white/40"}`}
                >
                  {saveBeneficiary && <Check className="size-3 text-black" />}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{tx.transfer_save_beneficiary}</p>
                  <p className="text-xs text-white/35">{tx.transfer_save_beneficiary_desc}</p>
                </div>
              </label>
              {saveBeneficiary && (
                <div className="ml-8">
                  <FL>{tx.transfer_nickname} <span className="normal-case font-normal text-white/25">{tx.transfer_nickname_optional}</span></FL>
                  <TextInput value={beneficiaryNickname} onChange={setBeneficiaryNickname} placeholder="e.g. Mom, Landlord" />
                </div>
              )}
            </div>

            <button
              onClick={nextStep2}
              className="mt-5 w-full bg-emerald-500 text-black font-black py-4 rounded-2xl hover:bg-emerald-400 transition flex items-center justify-center gap-2 text-sm"
            >
              {tx.transfer_next_options}
              <ChevronRight className="size-5" />
            </button>
          </>
        )}

        {/* ─── STEP 3 — Transfer Options ────────────────────────────────── */}
        {step === 3 && (
          <>
            <StepHeader step={3} onBack={() => go(2, "back")} />
            <h2 className="text-lg font-black text-white mb-0.5">{tx.transfer_options_title}</h2>
            <p className="text-xs text-white/40 mb-5">
              {tx.transfer_sending_to} <span className="text-white font-semibold">{recipientName}</span>
            </p>

            <div className="space-y-4">
              {/* From account */}
              <div>
                <FL>{tx.transfer_from_account}</FL>
                <div className="space-y-2">
                  {accounts.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => selectFromAccount(a.id)}
                      className={`w-full flex items-center justify-between rounded-xl px-4 py-3 border text-left transition ${fromAccountId === a.id ? "bg-emerald-400/10 border-emerald-400/30" : "bg-white/5 border-white/8 hover:bg-white/8"}`}
                    >
                      <span>
                        <span className="block text-sm font-black text-white">
                          {accountLabel(a.type)} •••• {a.accountNumber.slice(-4)}
                        </span>
                        <span className="block text-xs text-white/40">
                          {formatCurrency(a.availableBalance, a.currency)} {tx.transfer_available_suffix}
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

              {/* Purpose */}
              <div>
                <FL>{tx.transfer_purpose}</FL>
                <TextInput value={purpose} onChange={setPurpose} placeholder="e.g. Invoice payment, Rent, Family support" />
                <FE msg={errors.purpose} />
              </div>
            </div>

            <button
              onClick={nextStep3}
              className="mt-5 w-full bg-emerald-500 text-black font-black py-4 rounded-2xl hover:bg-emerald-400 transition flex items-center justify-center gap-2 text-sm"
            >
              {tx.transfer_next_amount}
              <ChevronRight className="size-5" />
            </button>
          </>
        )}

        {/* ─── STEP 4 — Amount ──────────────────────────────────────────── */}
        {step === 4 && (
          <>
            <StepHeader step={4} onBack={() => go(3, "back")} />
            <h2 className="text-lg font-black text-white mb-0.5">{tx.transfer_amount_title}</h2>
            <p className="text-xs text-white/40 mb-5">
              {currency} · to <span className="text-white font-semibold">{recipientName}</span>
            </p>

            {/* Amount display */}
            <div className="bg-white/5 border border-white/8 rounded-2xl px-5 py-5 mb-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-white/30 mb-0.5 uppercase tracking-wider">{currency}</p>
                <p className="text-4xl font-black text-white tracking-tight">
                  {currency === "USD" ? "$" : currency === "EUR" ? "€" : currency === "GBP" ? "£" : currency === "NGN" ? "₦" : currency === "JPY" ? "¥" : currency === "CNY" ? "¥" : currency === "INR" ? "₹" : currency === "BRL" ? "R$" : currency === "ZAR" ? "R" : ""}
                  {displayAmount}
                </p>
              </div>
              <button
                onClick={() => setRawAmount("0")}
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
                    ? `${tx.transfer_insufficient} — ${tx.transfer_available_suffix}: ${formatCurrency(availableBalance, fromAccount.currency)}`
                    : `${accountLabel(fromAccount.type)} ••${fromAccount.accountNumber.slice(-4)} — ${formatCurrency(availableBalance, fromAccount.currency)} ${tx.transfer_available_suffix}`
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
              onClick={nextStep4}
              className="w-full bg-emerald-500 text-black font-black py-4 rounded-2xl hover:bg-emerald-400 transition flex items-center justify-center gap-2 text-sm"
            >
              {tx.transfer_next_review}
              <ChevronRight className="size-5" />
            </button>
          </>
        )}

        {/* ─── STEP 5 — Review & Confirm ────────────────────────────────── */}
        {step === 5 && (
          <>
            <StepHeader step={5} onBack={() => go(4, "back")} />
            <h2 className="text-lg font-black text-white mb-0.5">{tx.transfer_review_confirm_title}</h2>
            <p className="text-xs text-white/40 mb-5">{tx.transfer_review_note}</p>

            {/* Amount hero */}
            <div className="text-center bg-white/5 border border-white/8 rounded-2xl py-6 mb-5">
              <p className="text-xs font-bold text-white/30 mb-1 uppercase tracking-wider">{tx.transfer_youre_sending}</p>
              <p className="text-4xl font-black text-white">{formatCurrency(numericAmount, currency)}</p>
              <p className="text-sm text-white/40 mt-1.5">
                {currency} ·{" "}
                {transferType === "INTERNATIONAL" ? tx.transfer_wire_label : transferType === "INTERNAL" ? tx.transfer_same_bank : tx.transfer_domestic}
              </p>
            </div>

            {/* Summary */}
            <div className="space-y-2 mb-5">
              <p className="text-[11px] font-black uppercase tracking-wider text-white/30 pt-1">{tx.transfer_recipient_section}</p>
              {(
                [
                  [tx.transfer_label_name, recipientName],
                  ...(transferType !== "INTERNAL" ? [[tx.transfer_label_bank, bankName] as [string, string]] : []),
                  ...(isIntl && iban ? [[tx.transfer_iban, iban] as [string, string]] : []),
                  ...(!isIntl || !iban ? [[tx.transfer_label_account, accountNumber] as [string, string]] : []),
                  ...(isIntl && swiftBic ? [[tx.transfer_swift, swiftBic] as [string, string]] : []),
                  ...(isDomestic && routingNumber ? [[tx.transfer_label_routing, routingNumber] as [string, string]] : []),
                  ...(isIntl && recipientAddress ? [[tx.transfer_label_address, recipientAddress] as [string, string]] : []),
                  [tx.transfer_country, recipientCountry],
                ] as [string, string][]
              ).filter(([, v]) => v).map(([label, val]) => (
                <div key={label} className="flex items-start justify-between bg-white/4 rounded-xl px-3.5 py-2.5 gap-3">
                  <span className="text-white/40 text-xs shrink-0">{label}</span>
                  <span className="font-semibold text-white text-xs text-right break-all">{val}</span>
                </div>
              ))}

              <p className="text-[11px] font-black uppercase tracking-wider text-white/30 pt-2">{tx.transfer_details_section}</p>
              {(
                [
                  [tx.transfer_label_from, fromAccount ? `${accountLabel(fromAccount.type)} •••• ${fromAccount.accountNumber.slice(-4)}` : ""],
                  [tx.common_type, transferType === "INTERNATIONAL" ? tx.transfer_wire_label : transferType === "INTERNAL" ? tx.transfer_same_bank : tx.transfer_domestic],
                  [tx.transfer_label_purpose, purpose],
                  [tx.transfer_fee, tx.transfer_fee_none],
                ] as [string, string][]
              ).map(([label, val]) => (
                <div key={label} className="flex items-start justify-between bg-white/4 rounded-xl px-3.5 py-2.5 gap-3">
                  <span className="text-white/40 text-xs shrink-0">{label}</span>
                  <span className={`font-semibold text-xs text-right ${label === tx.transfer_fee ? "text-emerald-400" : "text-white"}`}>{val}</span>
                </div>
              ))}

              {saveBeneficiary && (
                <div className="flex items-center gap-2 bg-emerald-400/8 border border-emerald-400/20 rounded-xl px-3.5 py-2.5">
                  <Bookmark className="size-3.5 text-emerald-400 shrink-0" />
                  <span className="text-xs text-white/55">
                    {tx.transfer_save_beneficiary} {beneficiaryNickname ? `"${beneficiaryNickname}"` : tx.transfer_saved_as_beneficiary}
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
                {tx.common_edit}
              </button>
              <button
                onClick={submit}
                disabled={submitting}
                className="flex-1 bg-emerald-500 text-black font-black py-3.5 rounded-2xl hover:bg-emerald-400 transition disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
              >
                <Send className="size-4" />
                {submitting ? tx.transfer_submitting : tx.transfer_confirm}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
