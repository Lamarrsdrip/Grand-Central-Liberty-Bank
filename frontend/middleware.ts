import { NextRequest, NextResponse } from "next/server";
import { securityHeaders } from "@/lib/security";
import { issueCsrfToken, verifyCsrfToken } from "@/lib/csrf";
import { LOCALE_COOKIE, detectLocaleFromAcceptLanguage, isSupportedLocale } from "@/lib/locales";

const csrfCookie = "gclb_csrf";
const mutatingMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Ensure every visitor has a signed CSRF token cookie.
  let csrfToken = request.cookies.get(csrfCookie)?.value;
  let issued = false;
  if (!csrfToken || !(await verifyCsrfToken(csrfToken))) {
    csrfToken = await issueCsrfToken();
    issued = true;
  }
  if (issued) {
    response.cookies.set(csrfCookie, csrfToken, {
      httpOnly: false, // readable by client JS to echo back in the x-csrf-token header
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/"
    });
  }

  // Auto-detect language from Accept-Language on first visit and pin it
  // into a year-long cookie so server components can render localized content.
  const existingLocale = request.cookies.get(LOCALE_COOKIE)?.value;
  if (!existingLocale || !isSupportedLocale(existingLocale)) {
    const detected = detectLocaleFromAcceptLanguage(request.headers.get("accept-language"));
    response.cookies.set(LOCALE_COOKIE, detected, {
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365
    });
  }

  // Enforce double-submit CSRF on mutating API calls (except auth/security bootstrap).
  if (
    request.nextUrl.pathname.startsWith("/api/") &&
    !request.nextUrl.pathname.startsWith("/api/auth/") &&
    !request.nextUrl.pathname.startsWith("/api/security/") &&
    mutatingMethods.has(request.method)
  ) {
    const headerToken = request.headers.get("x-csrf-token");
    const cookieToken = request.cookies.get(csrfCookie)?.value;
    // Header must equal the cookie AND carry a valid signature.
    if (!headerToken || headerToken !== cookieToken || !(await verifyCsrfToken(headerToken))) {
      return securityHeaders(NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 }));
    }
  }

  return securityHeaders(response);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
