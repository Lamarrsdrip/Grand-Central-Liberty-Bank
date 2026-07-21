/**
 * Canonical list of locales supported by Grand Central Liberty Bank.
 * Auto-detection picks the closest match from the user's Accept-Language
 * header (or a `gclb_locale` cookie set on first visit).
 */
export const SUPPORTED_LOCALES = [
  "en", // English
  "es", // Spanish
  "fr", // French
  "de", // German
  "pt", // Portuguese
  "it", // Italian
  "ar", // Arabic
  "zh", // Chinese (Simplified)
  "ja", // Japanese
  "hi", // Hindi
  "ru"  // Russian
] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const LOCALE_LABELS: Record<SupportedLocale, string> = {
  en: "English",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
  pt: "Português",
  it: "Italiano",
  ar: "العربية",
  zh: "中文",
  ja: "日本語",
  hi: "हिन्दी",
  ru: "Русский"
};

export const DEFAULT_LOCALE: SupportedLocale = "en";
export const LOCALE_COOKIE = "gclb_locale";

export function isSupportedLocale(value: unknown): value is SupportedLocale {
  return typeof value === "string" && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/**
 * Parse an Accept-Language header and pick the highest-quality language
 * tag that is in our supported list.  Falls back to DEFAULT_LOCALE.
 */
export function detectLocaleFromAcceptLanguage(header: string | null | undefined): SupportedLocale {
  if (!header) return DEFAULT_LOCALE;
  const candidates = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const qParam = params.find((p) => p.trim().startsWith("q="));
      const q = qParam ? Number(qParam.split("=")[1]) : 1;
      return { tag: tag.toLowerCase(), q: Number.isFinite(q) ? q : 1 };
    })
    .sort((a, b) => b.q - a.q);

  for (const { tag } of candidates) {
    const primary = tag.split("-")[0];
    if (isSupportedLocale(primary)) return primary;
  }
  return DEFAULT_LOCALE;
}
