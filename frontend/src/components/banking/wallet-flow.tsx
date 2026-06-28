"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowDownToLine, ArrowUpFromLine, Check, Copy, QrCode, RefreshCcw, Send, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Label, Select, Textarea } from "@/components/ui/input";
import { CryptoIcon } from "@/components/banking/crypto-icons";
import { MiniChart } from "@/components/banking/premium-ui";
import { cryptoAssets } from "@/components/banking/finance";
import { secureFetch } from "@/lib/client-api";
import { formatDate } from "@/lib/utils";
import { useTranslations } from "@/lib/i18n/use-translations";
import { formatInCurrency } from "@/lib/currency";
import { useCurrency } from "@/lib/currency-context";

type Wallet = {
  id: string;
  coin: string;
  symbol: string;
  address: string;
  network: string;
  label: string;
  qrCodeUrl?: string | null;
  depositInstructions?: string | null;
  enabled: boolean;
};

type HistoryItem = {
  id: string;
  type: string;
  amount: number;
  currency: string;
  description: string;
  reference: string;
  status: string;
  createdAt: Date | string;
  withdrawalId?: string | null;
};

export function WalletFlow({
  wallets,
  history,
  cryptoBalance
}: {
  wallets: Wallet[];
  history: HistoryItem[];
  cryptoBalance: number;
}) {
  const { tx } = useTranslations();
  const router = useRouter();

  const actions = [
    { key: "deposit", label: tx.wallet_action_deposit, icon: ArrowDownToLine },
    { key: "withdraw", label: tx.wallet_action_withdraw, icon: ArrowUpFromLine },
    { key: "swap", label: tx.wallet_action_swap, icon: RefreshCcw },
    { key: "receive", label: tx.wallet_action_receive, icon: QrCode },
    { key: "send", label: tx.wallet_action_send, icon: Send }
  ] as const;

  type WalletAction = (typeof actions)[number]["key"];

  const enabledWallets = wallets.filter((wallet) => wallet.enabled);
  const [action, setAction] = useState<WalletAction>("deposit");
  const [selectedWalletId, setSelectedWalletId] = useState(enabledWallets[0]?.id ?? "");
  const selectedWallet = enabledWallets.find((wallet) => wallet.id === selectedWalletId) ?? enabledWallets[0];
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState("");
  const [amount, setAmount] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [toAsset, setToAsset] = useState("ETH");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const selectedAsset = selectedWallet?.symbol ?? "BTC";
  const displayCurrency = useCurrency();
  const feePreview = useMemo(() => {
    const numeric = Number(amount);
    return Number.isFinite(numeric) && numeric > 0 ? Math.max(1.5, numeric * 0.006) : 0;
  }, [amount]);

  async function copyAddress() {
    if (!selectedWallet) return;
    await navigator.clipboard.writeText(selectedWallet.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  async function generateQr() {
    if (!selectedWallet) return;
    const QRCode = await import("qrcode");
    const url = await QRCode.toDataURL(selectedWallet.address, { margin: 1, width: 220 });
    setQrDataUrl(url);
  }

  async function submitCryptoRequest(kind: "WITHDRAW" | "SEND" | "SWAP") {
    setSubmitting(true);
    setMessage("");
    try {
      if (kind === "WITHDRAW") {
        const data = await secureFetch("/api/crypto/withdrawals", {
          method: "POST",
          body: JSON.stringify({
            asset: selectedAsset,
            network: selectedWallet?.network ?? "Mainnet",
            amount,
            recipientAddress,
            notes
          })
        });
        router.push(`/wallet/withdrawal/${data.withdrawalId}`);
        return;
      }
      const data = await secureFetch("/api/crypto/actions", {
        method: "POST",
        body: JSON.stringify({
          action: kind,
          asset: selectedAsset,
          network: selectedWallet?.network ?? "Mainnet",
          amount,
          toAsset: kind === "SWAP" ? toAsset : undefined,
          recipientAddress: kind === "SWAP" ? undefined : recipientAddress,
          notes
        })
      });
      setMessage(data.message ?? tx.wallet_request_submitted);
      setAmount("");
      setRecipientAddress("");
      setNotes("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : tx.wallet_request_failed);
    } finally {
      setSubmitting(false);
    }
  }

  const addressCard = (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
      {selectedWallet ? (
        <div className="grid gap-4 md:grid-cols-[1fr_14rem]">
          <div className="space-y-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-white/40">{tx.wallet_selected}</p>
              <div className="mt-1 flex items-center gap-3">
                <CryptoIcon symbol={selectedWallet.symbol} className="size-10" />
                <h3 className="text-xl font-black text-white">{selectedWallet.coin} {selectedWallet.network}</h3>
              </div>
              <p className="text-sm text-white/45">{selectedWallet.label}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
              <p className="mb-1 text-xs font-bold text-white/35">{tx.wallet_address_label}</p>
              <p className="break-all text-sm font-semibold text-white">{selectedWallet.address}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={copyAddress}>
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                {copied ? tx.wallet_copied : tx.wallet_copy_address}
              </Button>
              <Button type="button" variant="secondary" onClick={generateQr}>
                <QrCode className="size-4" />
                {tx.wallet_gen_qr}
              </Button>
            </div>
            <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/10 p-3 text-sm text-white/70">
              {selectedWallet.depositInstructions || tx.wallet_deposit_default}
            </div>
          </div>
          <div className="flex items-center justify-center rounded-3xl border border-white/10 bg-white p-4">
            {selectedWallet.qrCodeUrl || qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={selectedWallet.qrCodeUrl ?? qrDataUrl}
                alt={`${selectedWallet.symbol} deposit QR code`}
                className="h-48 w-48 rounded-2xl object-contain"
              />
            ) : (
              <div className="grid h-48 w-48 place-items-center rounded-2xl border border-slate-200 bg-slate-50 text-center text-xs font-bold text-slate-500">
                {tx.wallet_gen_qr}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid gap-3 text-center">
          <WalletCards className="mx-auto size-10 text-emerald-300" />
          <h3 className="text-xl font-black text-white">{tx.wallet_no_wallet_title}</h3>
          <p className="text-sm text-white/50">{tx.wallet_no_wallet_desc}</p>
          <Button asChild>
            <Link href="/support?message=Please%20help%20me%20activate%20a%20crypto%20deposit%20wallet.">{tx.wallet_contact_support}</Link>
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-5 fade-up">
      <div className="luxury-hero p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-white/40">{tx.wallet_crypto_value}</p>
            <p className="mt-2 text-4xl font-black text-white">{formatInCurrency(cryptoBalance, displayCurrency)}</p>
            <p className="mt-1 text-sm font-semibold text-green">{tx.wallet_manual_review_note}</p>
          </div>
          <MiniChart className="h-16 w-28" color="#f59e0b" path="M0 46 C16 28 30 34 44 18 C58 4 72 22 90 8" />
        </div>
      </div>

      <div className="card-dark p-4">
        <div className="grid grid-cols-5 gap-2">
          {actions.map((item) => {
            const Icon = item.icon;
            const active = action === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setAction(item.key)}
                className={`rounded-2xl border p-3 text-center transition ${
                  active ? "border-emerald-300 bg-emerald-300 text-black" : "border-white/10 bg-white/6 text-white hover:bg-white/10"
                }`}
              >
                <Icon className="mx-auto size-5" />
                <span className="mt-1 block text-[0.65rem] font-black">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="card-dark p-5">
        <div className="mb-4 grid gap-3 md:grid-cols-2">
          <Field>
            <Label>{tx.wallet_asset}</Label>
            <Select value={selectedWalletId} onChange={(event) => setSelectedWalletId(event.target.value)} disabled={!enabledWallets.length}>
              {enabledWallets.map((wallet) => (
                <option key={wallet.id} value={wallet.id}>{wallet.symbol} - {wallet.coin}</option>
              ))}
            </Select>
          </Field>
          <Field>
            <Label>{tx.wallet_network}</Label>
            <Input value={selectedWallet?.network ?? tx.wallet_no_network} readOnly />
          </Field>
        </div>

        {(action === "deposit" || action === "receive") && addressCard}

        {(action === "withdraw" || action === "send" || action === "swap") && (
          <div className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-2">
              <Field>
                <Label>{tx.common_amount}</Label>
                <Input value={amount} onChange={(event) => setAmount(event.target.value)} type="number" min="0" step="0.01" placeholder="0.00" />
              </Field>
              {action === "swap" ? (
                <Field>
                  <Label>{tx.wallet_receive_asset}</Label>
                  <Select value={toAsset} onChange={(event) => setToAsset(event.target.value)}>
                    {cryptoAssets.map((asset) => (
                      <option key={asset.symbol} value={asset.symbol}>{asset.symbol} - {asset.name}</option>
                    ))}
                  </Select>
                </Field>
              ) : (
                <Field>
                  <Label>{tx.wallet_recipient_address}</Label>
                  <Input value={recipientAddress} onChange={(event) => setRecipientAddress(event.target.value)} placeholder={tx.wallet_address_label} />
                </Field>
              )}
            </div>
            <Field>
              <Label>{tx.wallet_notes_label}</Label>
              <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder={tx.wallet_notes_placeholder} />
            </Field>
            <div className="grid gap-2 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm">
              <div className="flex justify-between"><span className="text-white/45">{tx.wallet_fee_estimate}</span><span className="font-black text-white">{formatInCurrency(feePreview, displayCurrency)}</span></div>
              <div className="flex justify-between"><span className="text-white/45">{tx.wallet_status_after}</span><span className="font-black text-emerald-300">{tx.wallet_manual_status}</span></div>
              <p className="text-xs text-white/40">{tx.wallet_admin_review_note}</p>
            </div>
            {message ? <p className="rounded-2xl bg-white/8 px-4 py-3 text-sm font-semibold text-white">{message}</p> : null}
            <Button
              type="button"
              onClick={() => submitCryptoRequest(action === "swap" ? "SWAP" : action === "send" ? "SEND" : "WITHDRAW")}
              disabled={submitting || !Number(amount) || (action !== "swap" && !recipientAddress.trim())}
              className="h-14 w-full"
            >
              {submitting ? tx.wallet_submitting : `${tx.wallet_manual_status} ${action}`}
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <div className="card-dark p-2">
          <p className="px-3 pt-3 text-sm font-black text-white">{tx.wallet_history}</p>
          {history.length ? (
            history.slice(0, 10).map((item) => {
              const isWithdrawal = item.withdrawalId;
              const statusColor =
                item.status === "PENDING_REVIEW" ? "text-amber-400" :
                item.status === "APPROVED" ? "text-emerald-400" :
                item.status === "FAILED" || item.status === "DECLINED" ? "text-red-400" :
                "text-white/40";
              const row = (
                <div key={item.id} className="coin-row px-3">
                  <div className="size-10 rounded-full bg-emerald-300 text-black grid place-items-center font-black">{item.type.slice(0, 1)}</div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black text-white">{item.description}</p>
                    <p className={`text-xs ${statusColor}`}>{formatDate(item.createdAt)} · {item.status.replace("_", " ")}</p>
                  </div>
                  <p className="text-sm font-black text-white">{formatInCurrency(Number(item.amount), displayCurrency)}</p>
                </div>
              );
              return isWithdrawal ? (
                <Link key={item.id} href={`/wallet/withdrawal/${item.withdrawalId}`} className="block hover:bg-white/5 rounded-2xl transition">
                  {row}
                </Link>
              ) : row;
            })
          ) : (
            <p className="p-6 text-center text-sm text-white/45">{tx.wallet_no_activity}</p>
          )}
        </div>
        <div className="card-dark p-5">
          <p className="text-sm font-black text-white">{tx.wallet_top_movers}</p>
          <div className="mt-4 space-y-3">
            {cryptoAssets.slice(0, 4).map((coin) => (
              <div key={coin.symbol} className="flex items-center gap-3">
                <CryptoIcon symbol={coin.symbol} className="size-9" />
                <div className="flex-1">
                  <p className="text-sm font-black text-white">{coin.symbol}</p>
                  <p className="text-xs text-white/40">{coin.name}</p>
                </div>
                <span className={coin.positive ? "text-xs font-black text-green" : "text-xs font-black text-red-300"}>{coin.change}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
