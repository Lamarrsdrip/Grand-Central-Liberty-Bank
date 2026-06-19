"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getTranslations, type TranslationKey } from "@/lib/i18n/translations";
import { isSupportedLocale, type SupportedLocale } from "@/lib/locales";

type TCtx = {
  t: (key: TranslationKey) => string;
  locale: SupportedLocale;
  isRtl: boolean;
};

const TranslationContext = createContext<TCtx>({
  t: (key) => key as string,
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
    // Sync locale with cookie on mount (handles cases where cookie differs from server render)
    const m = document.cookie.match(/(?:^|;\s*)gclb_locale=([^;]+)/);
    const fromCookie = m?.[1];
    if (isSupportedLocale(fromCookie) && fromCookie !== locale) setLocale(fromCookie);

    const handler = (e: Event) => {
      const next = (e as CustomEvent<string>).detail;
      if (isSupportedLocale(next)) setLocale(next);
    };
    window.addEventListener("locale-changed", handler);
    return () => window.removeEventListener("locale-changed", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dict = getTranslations(locale);
  const t = (key: TranslationKey): string => dict[key] ?? (key as string);
  const isRtl = ["ar", "he", "fa", "ur"].includes(locale);

  return (
    <TranslationContext.Provider value={{ t, locale, isRtl }}>
      <div dir={isRtl ? "rtl" : "ltr"} lang={locale} className="contents">
        {children}
      </div>
    </TranslationContext.Provider>
  );
}

export function useTranslations() {
  return useContext(TranslationContext);
}
