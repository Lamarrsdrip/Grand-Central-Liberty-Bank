"use client";

import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/input";
import { secureFetch } from "@/lib/client-api";

export const SUPPORTED_CURRENCIES = [
  { code: "USD", label: "USD — US Dollar" },
  { code: "EUR", label: "EUR — Euro" },
  { code: "GBP", label: "GBP — British Pound" },
  { code: "NGN", label: "NGN — Nigerian Naira" },
  { code: "CAD", label: "CAD — Canadian Dollar" },
  { code: "AUD", label: "AUD — Australian Dollar" },
  { code: "CHF", label: "CHF — Swiss Franc" },
  { code: "AED", label: "AED — UAE Dirham" },
  { code: "GHS", label: "GHS — Ghanaian Cedi" },
  { code: "ZAR", label: "ZAR — South African Rand" },
  { code: "JPY", label: "JPY — Japanese Yen" },
  { code: "CNY", label: "CNY — Chinese Yuan" },
  { code: "INR", label: "INR — Indian Rupee" },
  { code: "BRL", label: "BRL — Brazilian Real" },
  { code: "KRW", label: "KRW — South Korean Won" },
  { code: "MXN", label: "MXN — Mexican Peso" },
  { code: "IDR", label: "IDR — Indonesian Rupiah" },
  { code: "TRY", label: "TRY — Turkish Lira" },
  { code: "RUB", label: "RUB — Russian Ruble" },
  { code: "SEK", label: "SEK — Swedish Krona" },
  { code: "NOK", label: "NOK — Norwegian Krone" },
  { code: "DKK", label: "DKK — Danish Krone" },
  { code: "PLN", label: "PLN — Polish Złoty" },
  { code: "SGD", label: "SGD — Singapore Dollar" },
  { code: "HKD", label: "HKD — Hong Kong Dollar" },
  { code: "NZD", label: "NZD — New Zealand Dollar" },
  { code: "MYR", label: "MYR — Malaysian Ringgit" },
  { code: "PHP", label: "PHP — Philippine Peso" },
  { code: "THB", label: "THB — Thai Baht" },
  { code: "EGP", label: "EGP — Egyptian Pound" },
  { code: "KES", label: "KES — Kenyan Shilling" },
  { code: "PKR", label: "PKR — Pakistani Rupee" },
  { code: "BDT", label: "BDT — Bangladeshi Taka" },
  { code: "VND", label: "VND — Vietnamese Dong" },
  { code: "UAH", label: "UAH — Ukrainian Hryvnia" },
  { code: "ILS", label: "ILS — Israeli Shekel" },
  { code: "TZS", label: "TZS — Tanzanian Shilling" },
  { code: "UGX", label: "UGX — Ugandan Shilling" },
  { code: "ETB", label: "ETB — Ethiopian Birr" },
  { code: "MAD", label: "MAD — Moroccan Dirham" },
  { code: "XOF", label: "XOF — West African CFA Franc" },
  { code: "XAF", label: "XAF — Central African CFA Franc" },
];

export function CurrencySwitcher({ value }: { value: string }) {
  const router = useRouter();

  return (
    <Select
      aria-label="Currency"
      defaultValue={value}
      onChange={async (event) => {
        const next = event.target.value;
        document.cookie = `gclb_currency=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
        await secureFetch("/api/user/preferences", {
          method: "PATCH",
          body: JSON.stringify({ preferredCurrency: next })
        }).catch(() => {});
        router.refresh();
      }}
    >
      {SUPPORTED_CURRENCIES.map(({ code, label }) => (
        <option key={code} value={code}>
          {label}
        </option>
      ))}
    </Select>
  );
}
