"use client";
// Re-export from the canonical TranslationProvider so all consumers share one context
export { useTranslations } from "@/components/layout/translation-provider";
export type { TranslationKey } from "@/lib/i18n/translations";
export { LOCALE_COOKIE } from "@/lib/locales";
