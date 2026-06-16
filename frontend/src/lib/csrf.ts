// Edge- and Node-safe CSRF tokens using Web Crypto (crypto.subtle).
// Token format: `<nonce>.<hmac-sha256(nonce)>` signed with CSRF_SECRET.
// Used by middleware (Edge runtime) and the /api/security/csrf route.

function getSecret(): string {
  const secret = process.env.CSRF_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("CSRF_SECRET must be set and at least 32 characters.");
  }
  return secret;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(nonce: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(nonce));
  return bytesToBase64Url(new Uint8Array(sig));
}

/** Issue a fresh signed CSRF token. */
export async function issueCsrfToken(): Promise<string> {
  const nonceBytes = crypto.getRandomValues(new Uint8Array(18));
  const nonce = bytesToBase64Url(nonceBytes);
  const sig = await hmac(nonce);
  return `${nonce}.${sig}`;
}

/** Constant-time string comparison. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Verify a CSRF token's HMAC signature. Stateless — no server storage needed. */
export async function verifyCsrfToken(token: string | null | undefined): Promise<boolean> {
  if (!token || typeof token !== "string") return false;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return false;
  const nonce = token.slice(0, dot);
  const provided = token.slice(dot + 1);
  try {
    const expected = await hmac(nonce);
    return safeEqual(provided, expected);
  } catch {
    return false;
  }
}
