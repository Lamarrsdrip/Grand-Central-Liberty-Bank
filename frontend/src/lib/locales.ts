export const SUPPORTED_LOCALES = [
  "en",  // English
  "es",  // Spanish
  "fr",  // French
  "de",  // German
  "pt",  // Portuguese
  "it",  // Italian
  "ar",  // Arabic
  "zh",  // Chinese (Simplified)
  "ja",  // Japanese
  "ko",  // Korean
  "hi",  // Hindi
  "ru",  // Russian
  "tr",  // Turkish
  "nl",  // Dutch
  "pl",  // Polish
  "sv",  // Swedish
  "da",  // Danish
  "fi",  // Finnish
  "nb",  // Norwegian
  "cs",  // Czech
  "ro",  // Romanian
  "uk",  // Ukrainian
  "el",  // Greek
  "he",  // Hebrew
  "th",  // Thai
  "vi",  // Vietnamese
  "id",  // Indonesian
  "ms",  // Malay
  "bn",  // Bengali
  "fa",  // Persian
  "ur",  // Urdu
  "sw",  // Swahili
  "yo",  // Yoruba
  "ha",  // Hausa
  "ig",  // Igbo
  "am",  // Amharic
  "so",  // Somali
  "zu",  // Zulu
  "af",  // Afrikaans
] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const LOCALE_LABELS: Record<SupportedLocale, string> = {
  en:  "English",
  es:  "Español",
  fr:  "Français",
  de:  "Deutsch",
  pt:  "Português",
  it:  "Italiano",
  ar:  "العربية",
  zh:  "中文",
  ja:  "日本語",
  ko:  "한국어",
  hi:  "हिन्दी",
  ru:  "Русский",
  tr:  "Türkçe",
  nl:  "Nederlands",
  pl:  "Polski",
  sv:  "Svenska",
  da:  "Dansk",
  fi:  "Suomi",
  nb:  "Norsk",
  cs:  "Čeština",
  ro:  "Română",
  uk:  "Українська",
  el:  "Ελληνικά",
  he:  "עברית",
  th:  "ภาษาไทย",
  vi:  "Tiếng Việt",
  id:  "Bahasa Indonesia",
  ms:  "Bahasa Melayu",
  bn:  "বাংলা",
  fa:  "فارسی",
  ur:  "اردو",
  sw:  "Kiswahili",
  yo:  "Yorùbá",
  ha:  "Hausa",
  ig:  "Igbo",
  am:  "አማርኛ",
  so:  "Soomaali",
  zu:  "isiZulu",
  af:  "Afrikaans",
};

export const DEFAULT_LOCALE: SupportedLocale = "en";
export const LOCALE_COOKIE = "gclb_locale";

export function isSupportedLocale(value: unknown): value is SupportedLocale {
  return typeof value === "string" && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

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
