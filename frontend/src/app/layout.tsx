import type { Metadata, Viewport } from "next";
import { cookies, headers } from "next/headers";
import "./globals.css";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  detectLocaleFromAcceptLanguage,
  isSupportedLocale
} from "@/lib/locales";
import { FloatingSupportButton } from "@/components/layout/floating-support-button";
import { getCurrentUser } from "@/lib/auth";
import { getUnreadSupportReplyCount } from "@/lib/data";

export const metadata: Metadata = {
  title: "Grand Central Liberty Bank",
  description: "Premium digital banking platform for Grand Central Liberty Bank"
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

const RTL_LOCALES = new Set(["ar", "he", "fa", "ur"]);

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  const resolved = isSupportedLocale(cookieLocale)
    ? cookieLocale
    : detectLocaleFromAcceptLanguage(headerStore.get("accept-language")) ?? DEFAULT_LOCALE;
  const dir = RTL_LOCALES.has(resolved) ? "rtl" : "ltr";
  const currentUser = await getCurrentUser();
  const unreadSupportReplies =
    currentUser && currentUser.role !== "ADMIN" ? await getUnreadSupportReplyCount(currentUser.id).catch(() => 0) : 0;

  return (
    <html lang={resolved} dir={dir} suppressHydrationWarning>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{const t=localStorage.getItem('gclb-theme')||'system';const d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d)}catch(e){}"
          }}
        />
        {children}
        {currentUser?.role !== "ADMIN" ? (
          <FloatingSupportButton signedIn={Boolean(currentUser)} unreadCount={unreadSupportReplies} />
        ) : null}
      </body>
    </html>
  );
}
