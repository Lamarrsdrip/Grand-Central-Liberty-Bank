"use client";

import { useState } from "react";
import { Landmark, Bitcoin, Copy, Check } from "lucide-react";
import { useTranslations } from "@/lib/i18n/use-translations";

type Account = { id: string; type: string; accountNumber: string; currency: string };
type Wallet = { id: string; coin: string; symbol: string; address: string; network: string; depositInstructions?: string | null };

const GCLB_ROUTING = "026009593";
const GCLB_SWIFT   = "GCLBUS33";

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-white/5 last:border-0">
      <span className="text-xs text-white/40 shrink-0 w-28">{label}</span>
      <div className="flex items-center gap-2 min-w-0">
        <span className="font-mono text-xs text-white/80 truncate">{value}</span>
        <button
          type="button"
          title="Copy"
          className="shrink-0 text-white/20 hover:text-green transition"
          onClick={async () => {
            await navigator.clipboard.writeText(value).catch(() => null);
            setCopied(true);
            setTimeout(() => setCopied(false), 1400);
          }}
        >
          {copied ? <Check className="size-3 text-green" /> : <Copy className="size-3" />}
        </button>
      </div>
    </div>
  );
}

export function DepositSection({ accounts, wallets }: { accounts: Account[]; wallets: Wallet[] }) {
  const { tx } = useTranslations();
  const [tab, setTab] = useState<"bank" | "crypto">("bank");
  const bankAccounts = accounts.filter((a) => a.type !== "CRYPTO");
  const [selectedAccount, setSelectedAccount] = useState(bankAccounts[0]?.id ?? "");
  const account = bankAccounts.find((a) => a.id === selectedAccount) ?? bankAccounts[0];

  return (
    <div className="card-dark p-5">
      <h3 className="font-black text-white mb-4">{tx.deposit_funds}</h3>

      <div className="flex gap-2 mb-5">
        <button
          type="button"
          onClick={() => setTab("bank")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition ${
            tab === "bank" ? "bg-green text-black" : "bg-white/8 text-white/60 hover:bg-white/12"
          }`}
        >
          <Landmark className="size-4" />
          {tx.deposit_bank_wire}
        </button>
        <button
          type="button"
          onClick={() => setTab("crypto")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition ${
            tab === "crypto" ? "bg-green text-black" : "bg-white/8 text-white/60 hover:bg-white/12"
          }`}
        >
          <Bitcoin className="size-4" />
          {tx.deposit_crypto}
        </button>
      </div>

      {tab === "bank" && (
        <div className="space-y-4">
          {bankAccounts.length > 1 && (
            <div className="flex gap-2 mb-2">
              {bankAccounts.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setSelectedAccount(a.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    selectedAccount === a.id ? "bg-white/15 text-white" : "text-white/40 hover:text-white/70"
                  }`}
                >
                  {a.type === "CHECKING" ? tx.deposit_checking : tx.deposit_savings} ···{a.accountNumber.slice(-4)}
                </button>
              ))}
            </div>
          )}

          <div className="rounded-xl bg-black/20 border border-white/8 p-4">
            <p className="text-[0.6rem] font-black uppercase tracking-widest text-white/30 mb-3">
              {tx.deposit_wire_details}
            </p>
            <CopyRow label={tx.deposit_bank_name} value="Grand Central Liberty Bank" />
            <CopyRow label={tx.deposit_bank_address} value="200 Liberty Plaza, New York, NY 10006" />
            {account && <CopyRow label={tx.deposit_account_number} value={account.accountNumber} />}
            <CopyRow label={tx.deposit_routing} value={GCLB_ROUTING} />
            <CopyRow label={tx.deposit_swift} value={GCLB_SWIFT} />
            {account && (
              <CopyRow
                label={tx.deposit_iban}
                value={`US98 GCLB ${account.accountNumber.slice(0, 4)} ${account.accountNumber.slice(4)}`}
              />
            )}
            {account && <CopyRow label={tx.deposit_currency} value={account.currency} />}
          </div>

          <p className="text-xs text-white/30 leading-5">{tx.deposit_wire_note}</p>
        </div>
      )}

      {tab === "crypto" && (
        <div className="space-y-3">
          {wallets.length === 0 && (
            <p className="text-sm text-white/40 text-center py-6">{tx.deposit_no_wallets}</p>
          )}
          {wallets.map((wallet) => (
            <div key={wallet.id} className="rounded-xl bg-black/20 border border-white/8 p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-black text-white">{wallet.coin} <span className="text-white/40 font-semibold">({wallet.symbol})</span></p>
                  <p className="text-[0.65rem] text-white/30">{wallet.network}</p>
                </div>
              </div>
              <CopyRow label={tx.deposit_address} value={wallet.address} />
              {wallet.depositInstructions && (
                <p className="mt-2 text-[0.65rem] text-white/30 leading-4">{wallet.depositInstructions}</p>
              )}
            </div>
          ))}
          <p className="text-xs text-white/30 leading-5">{tx.deposit_crypto_note}</p>
        </div>
      )}
    </div>
  );
}
