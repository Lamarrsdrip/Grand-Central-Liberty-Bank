import { NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import speakeasy from "speakeasy";
import { handleApi, ok } from "@/lib/api";
import { auditLog } from "@/lib/audit";
import { createSession, requestIpAndAgent, sessionCookieName, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assertRateLimit } from "@/lib/security";
import { loginSchema } from "@/lib/validators";
import type { Role, UserStatus } from "@prisma/client";

// Raw MongoDB user document shape returned by $runCommandRaw.
type RawUserDoc = {
  _id: { $oid: string } | string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  passwordHash: string;
  twoFactorEnabled?: boolean;
  twoFactorSecret?: string | null;
  preferredLocale?: string;
  preferredCurrency?: string;
  themePreference?: string;
};

// Convert a raw MongoDB document to a Prisma-compatible user shape.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function userFromRaw(doc: RawUserDoc): any {
  const rawId = doc._id;
  const id =
    typeof rawId === "object" && rawId !== null && "$oid" in rawId
      ? rawId.$oid
      : String(rawId);
  return {
    id,
    email: doc.email,
    firstName: doc.firstName,
    lastName: doc.lastName,
    role: doc.role as Role,
    status: doc.status as UserStatus,
    passwordHash: doc.passwordHash,
    twoFactorEnabled: Boolean(doc.twoFactorEnabled),
    twoFactorSecret: doc.twoFactorSecret ?? null,
    preferredLocale: doc.preferredLocale ?? "en",
    preferredCurrency: doc.preferredCurrency ?? "USD",
    themePreference: doc.themePreference ?? "system",
    emailVerifiedAt: null as Date | null,
    phone: "",
    country: "",
    address: "",
    dateOfBirth: new Date(0),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

async function recordLoginAttempt(input: {
  userId?: string;
  email: string;
  ip?: string;
  userAgent?: string;
  success: boolean;
}) {
  await prisma.$runCommandRaw({
    insert: "LoginHistory",
    documents: [
      {
        _id: { $oid: randomBytes(12).toString("hex") },
        userId: input.userId ? { $oid: input.userId } : null,
        email: input.email,
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null,
        success: input.success,
        createdAt: { $date: new Date().toISOString() }
      }
    ],
    writeConcern: { w: 1 }
  });
}

export async function POST(request: NextRequest) {
  return handleApi(async () => {
    // 25 attempts per IP per minute — generous enough for shared proxy IPs
    assertRateLimit(request, "login", 25);
    const input = loginSchema.parse(await request.json());
    const { ip, userAgent } = await requestIpAndAgent();
    const lookupEmail = input.email.trim().toLowerCase();

    // ── Primary lookup: Prisma ORM ────────────────────────────────────────────
    let user = await prisma.user.findUnique({ where: { email: lookupEmail } }).catch((err: Error) => {
      console.error("[login] prisma.user.findUnique error:", err.message);
      return null;
    });

    // ── Fallback: $runCommandRaw direct MongoDB query ─────────────────────────
    // If Prisma ORM returns null (e.g. due to DB-URL mismatch, stale client, or
    // a Prisma unique-index lookup bug), re-try with a raw find command which
    // bypasses the ORM layer entirely. This also works on standalone MongoDB.
    if (!user) {
      const rawResult = await prisma.$runCommandRaw({
        find: "User",
        filter: { email: lookupEmail },
        limit: 1,
      }).catch((err: Error) => {
        console.error("[login] $runCommandRaw fallback error:", err.message);
        return null;
      }) as { cursor?: { firstBatch?: RawUserDoc[] } } | null;

      const rawDoc = rawResult?.cursor?.firstBatch?.[0];

      if (rawDoc) {
        console.error(
          "[login:debug] Prisma findUnique returned null; raw query found user. " +
          "db_email=%s role=%s status=%s hash_prefix=%s",
          rawDoc.email,
          rawDoc.role,
          rawDoc.status,
          rawDoc.passwordHash ? rawDoc.passwordHash.slice(0, 7) : "MISSING"
        );
        user = userFromRaw(rawDoc);
      } else {
        console.error("[login:debug] NOT FOUND by Prisma or raw query. email=%s", lookupEmail);
      }
    }

    console.error(
      "[login:debug] email=%s found=%s role=%s status=%s hash_prefix=%s",
      lookupEmail,
      user ? "YES" : "NO",
      user?.role ?? "n/a",
      user?.status ?? "n/a",
      user?.passwordHash ? user.passwordHash.slice(0, 7) : "MISSING"
    );

    const passwordValid = user
      ? await verifyPassword(input.password, user.passwordHash)
      : false;

    console.error("[login:debug] passwordValid=%s", passwordValid);

    void recordLoginAttempt({
      userId: user?.id,
      email: lookupEmail,
      ip,
      userAgent,
      success: Boolean(user && passwordValid),
    }).catch((error) => console.error("[auth] login history failed:", error));

    if (!user) {
      console.error("[login:debug] REJECT: user not found for email=%s", lookupEmail);
      throw new Response("Invalid credentials.", { status: 401 });
    }
    if (!passwordValid) {
      console.error("[login:debug] REJECT: password mismatch for email=%s hash_prefix=%s",
        lookupEmail, user.passwordHash ? user.passwordHash.slice(0, 7) : "MISSING");
      throw new Response("Invalid credentials.", { status: 401 });
    }

    if (user.status === "SUSPENDED") {
      throw new Response("This account has been suspended. Please contact support for assistance.", { status: 403 });
    }

    if (user.twoFactorEnabled) {
      const secret = user.twoFactorSecret;
      if (!input.twoFactorToken || !secret) {
        throw new Response("Two-factor code is required.", { status: 401 });
      }
      const tokenValid = speakeasy.totp.verify({
        secret,
        encoding: "base32",
        token: input.twoFactorToken,
        window: 1
      });

      if (!tokenValid) {
        throw new Response("Two-factor code is required.", { status: 401 });
      }
    }

    const session = await createSession(user, { ip, userAgent });
    void auditLog({ actorId: user.id, action: "USER_LOGIN", entity: "Session", entityId: session.sessionId, ip, userAgent });

    const response = ok({
      user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role }
    });
    response.cookies.set(sessionCookieName, session.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      expires: session.expiresAt,
      path: "/"
    });
    response.cookies.set("gclb_locale", user.preferredLocale ?? "en", {
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
      path: "/"
    });
    return response;
  });
}
