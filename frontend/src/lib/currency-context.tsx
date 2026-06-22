"use client";

import { createContext, useContext } from "react";
import { formatInCurrency, compactInCurrency } from "@/lib/currency";

const CurrencyContext = createContext("USD");

export function CurrencyProvider({
  currency,
  children,
}: {
  currency: string;
  children: React.ReactNode;
}) {
  return (
    <CurrencyContext.Provider value={currency ?? "USD"}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}

export function useFormatCurrency() {
  const currency = useCurrency();
  return (amount: number | unknown) =>
    formatInCurrency(Number(amount) || 0, currency);
}

export function useCompactCurrency() {
  const currency = useCurrency();
  return (amount: number | unknown) =>
    compactInCurrency(Number(amount) || 0, currency);
}
