"use client";

import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/input";
import { secureFetch } from "@/lib/client-api";
import { LOCALE_LABELS, SUPPORTED_LOCALES, type SupportedLocale } from "@/lib/locales";

export function LocaleSwitcher({ value }: { value: string }) {
  const router = useRouter();

  return (
    <Select
      aria-label="Language"
      data-testid="locale-switcher"
      defaultValue={value}
      onChange={async (event) => {
        const next = event.target.value;
        // Mirror the choice into the cookie so server-rendered pages and the
        // auto-detection middleware respect it on subsequent visits.
        document.cookie = `gclb_locale=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
        await secureFetch("/api/user/preferences", {
          method: "PATCH",
          body: JSON.stringify({ preferredLocale: next })
        }).catch(() => {/* unauthenticated visitors only get the cookie */});
        router.refresh();
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
