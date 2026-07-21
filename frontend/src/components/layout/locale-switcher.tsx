"use client";

import { Select } from "@/components/ui/input";
import { secureFetch } from "@/lib/client-api";
import { LOCALE_LABELS, SUPPORTED_LOCALES, type SupportedLocale } from "@/lib/locales";

export function LocaleSwitcher({ value }: { value: string }) {
  return (
    <Select
      aria-label="Language"
      data-testid="locale-switcher"
      defaultValue={value}
      onChange={async (event) => {
        const next = event.target.value;
        // Set cookie so new value is available immediately on the next page load
        document.cookie = `gclb_locale=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
        // Fire instant event so TranslationProvider updates before the reload
        window.dispatchEvent(new CustomEvent("locale-changed", { detail: next }));
        // Save to DB
        await secureFetch("/api/user/preferences", {
          method: "PATCH",
          body: JSON.stringify({ preferredLocale: next })
        }).catch(() => {});
        // Hard reload so server renders everything fresh with the new locale
        window.location.reload();
      }}
    >
      {SUPPORTED_LOCALES.map((code) => (
        <option key={code} value={code}>
          {LOCALE_LABELS[code as SupportedLocale]}
        </option>
      ))}
    </Select>
  );
}
