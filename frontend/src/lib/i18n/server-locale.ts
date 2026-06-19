import { getTranslations } from "@/lib/i18n/translations";
import { isSupportedLocale } from "@/lib/locales";

export function getServerTranslations(locale: string | undefined | null) {
  const safe = isSupportedLocale(locale) ? locale : "en";
  return { tx: getTranslations(safe), locale: safe };
}
