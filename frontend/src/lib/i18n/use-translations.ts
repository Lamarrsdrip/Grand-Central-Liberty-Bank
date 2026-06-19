"use client";

import { useEffect, useState } from "react";
import { LOCALE_COOKIE, type SupportedLocale } from "@/lib/locales";
import { getTranslations, type TranslationKey } from "@/lib/i18n/translations";

function readLocaleCookie(): SupportedLocale {
  if (typeof document === "undefined") return "en";
  const match = document.cookie.match(/(?:^|;\s*)gclb_locale=([^;]+)/);
  return (match?.[1] ?? "en") as SupportedLocale;
}

export function useTranslations() {
  const [locale, setLocale] = useState<SupportedLocale>("en");

  useEffect(() => {
    setLocale(readLocaleCookie());
    // Listen for cookie changes driven by LocaleSwitcher
    const handler = () => setLocale(readLocaleCookie());
    window.addEventListener("locale-changed", handler);
    return () => window.removeEventListener("locale-changed", handler);
  }, []);

  const dict = getTranslations(locale);
  const translate = (key: TranslationKey) => dict[key] ?? key;

  return { t: translate, locale, isRtl: ["ar", "he", "fa", "ur"].includes(locale) };
}

export type { TranslationKey };

export { LOCALE_COOKIE };
