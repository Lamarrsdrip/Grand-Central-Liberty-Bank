import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number | string | null | undefined, currency = "USD") {
  const number = typeof value === "string" ? parseFloat(value) : Number(value ?? 0);
  const safe = Number.isFinite(number) ? number : 0;
  // Normalize currency to a valid ISO 4217 code; fall back to USD if unknown
  const iso = (currency ?? "USD").trim().toUpperCase();
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: iso,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(safe);
  } catch {
    // Unknown currency code — fall back to plain number with currency prefix
    return `${iso} ${safe.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}

export function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}

export function initials(firstName?: string | null, lastName?: string | null) {
  return `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase() || "GC";
}

export function absoluteUrl(path: string) {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  return new URL(path, base).toString();
}
