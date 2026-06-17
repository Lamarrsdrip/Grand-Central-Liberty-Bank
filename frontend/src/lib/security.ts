import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit = 40, windowMs = 60_000) {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  if (bucket.count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  bucket.count += 1;
  return { allowed: true, remaining: limit - bucket.count };
}

export function getClientIp(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip") ?? "local";
}

export async function jsonBody<T extends z.ZodTypeAny>(request: Request, schema: T): Promise<z.infer<T>> {
  const body = await request.json().catch(() => null);
  return schema.parse(body);
}

export function apiError(error: unknown) {
  if (error instanceof Response) {
    const status = error.status || 500;
    return error.text().then((message) =>
      NextResponse.json(
        { error: message || (status === 401 ? "Unauthorized" : "Request could not be completed.") },
        { status }
      )
    );
  }

  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { error: "Validation failed", issues: error.issues.map((issue) => issue.message) },
      { status: 400 }
    );
  }

  if (error instanceof Error) {
    console.error("[api]", error);
    return NextResponse.json(
      { error: "Request could not be completed. Please try again or contact support." },
      { status: 500 }
    );
  }

  console.error("[api] unexpected", error);
  return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
}

export function assertRateLimit(request: NextRequest, scope: string, limit?: number) {
  const key = `${scope}:${getClientIp(request)}`;
  const result = rateLimit(key, limit);
  if (!result.allowed) {
    throw new Response("Too many requests", { status: 429 });
  }
}

export function securityHeaders(response: NextResponse) {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  const isProd = process.env.NODE_ENV === "production";

  // In production, drop 'unsafe-eval' entirely. Next.js still needs 'unsafe-inline'
  // for its hydration/runtime scripts unless a per-request nonce is plumbed through,
  // so inline is kept but eval is removed. Dev keeps eval for React Fast Refresh.
  const scriptSrc = isProd
    ? "script-src 'self' 'unsafe-inline'"
    : "script-src 'self' 'unsafe-inline' 'unsafe-eval'";

  const connectSrc = isProd
    ? "connect-src 'self' wss:"
    : "connect-src 'self' ws: wss:";

  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "img-src 'self' data: blob: https:",
      scriptSrc,
      "style-src 'self' 'unsafe-inline'",
      connectSrc,
      "font-src 'self' data:",
      "form-action 'self'",
      "frame-ancestors 'none'",
      ...(isProd ? ["upgrade-insecure-requests"] : [])
    ].join("; ") + ";"
  );

  if (isProd) {
    response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }

  return response;
}
