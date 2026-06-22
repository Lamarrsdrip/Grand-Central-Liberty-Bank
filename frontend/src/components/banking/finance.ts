/**
 * Pure (non-client) finance helpers and seed data.
 *
 * These are imported by both server and client components, so this file
 * must NOT have a `"use client"` directive.  premium-ui.tsx re-exports
 * the same symbols for any consumer that already imports from there.
 */
import { formatCurrency } from "@/lib/utils";

export const cryptoAssets = [
  { symbol: "BTC",  name: "Bitcoin",   color: "#f59e0b", change: "+2.35%", positive: true,  price: "$27,649.21", amount: "0.568402" },
  { symbol: "ETH",  name: "Ethereum",  color: "#6366f1", change: "+1.12%", positive: true,  price: "$8,812.36",  amount: "4.214560" },
  { symbol: "USDT", name: "Tether",    color: "#10b981", change: "+0.01%", positive: true,  price: "$3,250.00",  amount: "3,250.00" },
  { symbol: "BNB",  name: "BNB",       color: "#eab308", change: "-0.43%", positive: false, price: "$2,197.21",  amount: "6.245"    },
  { symbol: "SOL",  name: "Solana",    color: "#8b5cf6", change: "+3.21%", positive: true,  price: "$1,987.45",  amount: "12.32"    },
  { symbol: "XRP",  name: "XRP",       color: "#94a3b8", change: "+0.88%", positive: true,  price: "$1,562.50",  amount: "1,250.00" },
  { symbol: "DOGE", name: "Dogecoin",  color: "#f97316", change: "+2.10%", positive: true,  price: "$1,234.48",  amount: "5,000.00" }
];

export const marketSignals = [
  { pair: "USD / EUR", value: "0.9214", change: "+0.21%", positive: true },
  { pair: "USD / GBP", value: "0.7892", change: "-0.08%", positive: false },
  { pair: "USD / JPY", value: "156.48",  change: "+0.35%", positive: true  },
  { pair: "USD / CHF", value: "0.8921",  change: "+0.18%", positive: true  }
];

export function accountLabel(type: string) {
  const map: Record<string, string> = {
    CHECKING: "Checking", SAVINGS: "Savings", CRYPTO: "Crypto",
    BUSINESS: "Business", JOINT: "Joint"
  };
  return map[type] ?? type.charAt(0) + type.slice(1).toLowerCase().replace(/_/g, " ");
}

export function statusText(value?: string | null) {
  return (value ?? "ACTIVE").replaceAll("_", " ");
}

export function money(value: unknown, currency = "USD") {
  return formatCurrency(Number(value), currency);
}

export function compactMoney(value: unknown, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency,
    notation: "compact", maximumFractionDigits: 1
  }).format(Number(value) || 0);
}
