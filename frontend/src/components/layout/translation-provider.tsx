"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getTranslations, type TranslationKey, type TranslationDict } from "@/lib/i18n/translations";
import { isSupportedLocale, type SupportedLocale } from "@/lib/locales";

type TCtx = {
  t: (key: TranslationKey) => string;
  tx: TranslationDict;
  locale: SupportedLocale;
  isRtl: boolean;
};

const fallbackDict = new Proxy({} as TranslationDict, { get: (_t, k) => k as string });

const TranslationContext = createContext<TCtx>({
  t: (key) => key as string,
  tx: fallbackDict,
  locale: "en",
  isRtl: false,
});

export function TranslationProvider({
  children,
  initialLocale = "en",
}: {
  children: React.ReactNode;
  initialLocale?: string;
}) {
  const initial = isSupportedLocale(initialLocale) ? initialLocale : "en";
  const [locale, setLocale] = useState<SupportedLocale>(initial);

  useEffect(() => {
    // Listen for client-side locale changes from LocaleSwitcher
    const handler = (e: Event) => {
      const next = (e as CustomEvent<string>).detail;
      if (isSupportedLocale(next)) setLocale(next);
    };
    window.addEventListener("locale-changed", handler);
    return () => window.removeEventListener("locale-changed", handler);
  }, []);

  const dict = getTranslations(locale);
  const t = (key: TranslationKey): string => dict[key] ?? (key as string);
  const isRtl = ["ar", "he", "fa", "ur"].includes(locale);

  return (
    <TranslationContext.Provider value={{ t, tx: dict, locale, isRtl }}>
      <div dir={isRtl ? "rtl" : "ltr"} lang={locale} className="contents">
        {children}
      </div>
    </TranslationContext.Provider>
  );
}

export function useTranslations() {
  return useContext(TranslationContext);
}
