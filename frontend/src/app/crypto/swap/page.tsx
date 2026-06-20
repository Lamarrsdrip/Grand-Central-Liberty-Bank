"use client";

import { useState } from "react";
import { RefreshCcw } from "lucide-react";
import { secureFetch } from "@/lib/client-api";
import { useTranslations } from "@/lib/i18n/use-translations";

const SUPPORTED_ASSETS = ["USD", "EUR", "GBP", "BTC", "ETH", "USDT", "USDC", "SOL", "BNB", "XRP", "DOGE"];

interface QuoteResult {
  fromAsset: string;
  toAsset: string;
  fromAmount: number;
  toAmount: number;
  rate: number;
  feeAmount: number;
  feeCurrency: string;
  feePercent: number;
}

export default function SwapPage() {
  const { tx } = useTranslations();
  const [fromAsset, setFromAsset] = useState("USD");
  const [toAsset, setToAsset] = useState("BTC");
  const [fromAmount, setFromAmount] = useState("");
  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [swapRef, setSwapRef] = useState("");

  const handleGetQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(fromAmount);
    if (!amt || amt <= 0) { setError(tx.swap_invalid_amount); return; }
    if (fromAsset === toAsset) { setError(tx.swap_same_asset); return; }
    setQuoting(true); setError(""); setQuote(null); setSuccess("");
    try {
      const result = await secureFetch("/api/swap/quote", {
        method: "POST",
        body: JSON.stringify({ fromAsset, toAsset, fromAmount: amt })
      });
      setQuote(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : tx.swap_quote_failed);
    } finally { setQuoting(false); }
  };

  const handleConfirmSwap = async () => {
    if (!quote) return;
    setSwapping(true); setError(""); setSuccess("");
    try {
      const result = await secureFetch("/api/swap", {
        method: "POST",
        body: JSON.stringify({
          fromAsset: quote.fromAsset,
          toAsset: quote.toAsset,
          fromAmount: quote.fromAmount,
          confirmedRate: quote.rate
        })
      });
      setSwapRef(result.reference);
      setSuccess(`${tx.swap_completed} ${result.toAmount} ${quote.toAsset}.`);
      setQuote(null);
      setFromAmount("");
    } catch (err) {
      setError(err instanceof Error ? err.message : tx.swap_failed);
    } finally { setSwapping(false); }
  };

  const flip = () => {
    setFromAsset(toAsset);
    setToAsset(fromAsset);
    setQuote(null);
    setError("");
  };

  return (
    <div className="min-h-screen bg-background flex items-start justify-center pt-12 px-4">
      <div className="w-full max-w-md space-y-5 fade-up">
        <div>
          <h1 className="text-3xl font-black text-white">{tx.swap_title}</h1>
          <p className="text-sm text-white/50 mt-1">{tx.swap_desc}</p>
        </div>

        <div className="card-dark p-6 space-y-4">
          <form onSubmit={handleGetQuote} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">{tx.swap_from}</label>
              <div className="flex gap-2">
                <select
                  value={fromAsset}
                  onChange={e => { setFromAsset(e.target.value); setQuote(null); }}
                  className="rounded-lg bg-white/8 border border-white/10 text-white text-sm px-3 py-2 w-28 shrink-0 focus:outline-none focus:border-white/30"
                >
                  {SUPPORTED_ASSETS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
                <input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="0.00"
                  value={fromAmount}
                  onChange={e => { setFromAmount(e.target.value); setQuote(null); }}
                  className="flex-1 rounded-lg bg-white/8 border border-white/10 text-white text-sm px-3 py-2 focus:outline-none focus:border-white/30 placeholder:text-white/30"
                  required
                />
              </div>
            </div>

            <div className="flex justify-center">
              <button
                type="button"
                onClick={flip}
                className="size-9 rounded-full bg-white/8 border border-white/10 flex items-center justify-center hover:bg-white/15 transition"
              >
                <RefreshCcw className="size-4 text-white/60" />
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">{tx.swap_to}</label>
              <div className="flex gap-2 items-center">
                <select
                  value={toAsset}
                  onChange={e => { setToAsset(e.target.value); setQuote(null); }}
                  className="rounded-lg bg-white/8 border border-white/10 text-white text-sm px-3 py-2 w-28 shrink-0 focus:outline-none focus:border-white/30"
                >
                  {SUPPORTED_ASSETS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
                <div className="flex-1 rounded-lg bg-white/5 border border-white/8 text-white/60 text-sm px-3 py-2 min-h-[38px]">
                  {quote ? quote.toAmount.toFixed(8).replace(/\.?0+$/, "") : "—"}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={quoting}
              className="w-full rounded-lg bg-green/90 hover:bg-green text-black font-bold py-2.5 text-sm transition disabled:opacity-50"
            >
              {quoting ? tx.swap_getting_quote : tx.swap_get_quote}
            </button>
          </form>

          {quote && (
            <div className="rounded-lg bg-white/5 border border-white/10 p-4 space-y-2 text-sm">
              <div className="flex justify-between text-white/70">
                <span>{tx.swap_rate}</span>
                <span className="font-semibold text-white">1 {quote.fromAsset} = {quote.rate.toFixed(6)} {quote.toAsset}</span>
              </div>
              <div className="flex justify-between text-white/70">
                <span>{tx.swap_network_fee} ({quote.feePercent}%)</span>
                <span className="font-semibold text-white">${quote.feeAmount.toFixed(4)} {quote.feeCurrency}</span>
              </div>
              <div className="flex justify-between text-white/70 border-t border-white/10 pt-2">
                <span>{tx.swap_you_receive}</span>
                <span className="font-black text-white">{quote.toAmount.toFixed(8).replace(/\.?0+$/, "")} {quote.toAsset}</span>
              </div>
              <button
                onClick={handleConfirmSwap}
                disabled={swapping}
                className="w-full mt-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white font-bold py-2.5 text-sm transition disabled:opacity-50"
              >
                {swapping ? tx.swap_processing : tx.swap_confirm}
              </button>
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-500/15 border border-red-500/30 px-3 py-2 text-sm text-red-400">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-lg bg-green/10 border border-green/30 px-3 py-2 text-sm text-green space-y-1">
              <p className="font-bold">{success}</p>
              {swapRef && <p className="text-xs text-white/50">{tx.swap_reference}: {swapRef}</p>}
            </div>
          )}
        </div>

        <p className="text-center text-xs text-white/40">
          <a href="/crypto" className="underline hover:text-white/70 transition">{tx.common_back}</a>
        </p>
      </div>
    </div>
  );
}
