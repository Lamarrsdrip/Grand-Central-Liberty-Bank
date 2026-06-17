import { cookies, headers } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { jwtVerify, SignJWT } from "jose";
import { Role, UserStatus } from "@prisma/client";
import { prisma } from "@/lib/db";

export const sessionCookieName = "gclb_session";

export type SessionRole = "USER" | "ADMIN";

export type SessionTokenPayload = {
  sessionId: string;
  userId: string;
  role: SessionRole;
};

export type AuthenticatedUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  status: UserStatus;
  preferredLocale: string;
  themePreference: string;
};

function jwtSecret() {
  const raw =
    process.env.JWT_SECRET ||
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.CSRF_SECRET ||
    process.env.SETTINGS_MASTER_KEY;

  if (!raw) {
    throw new Error("JWT_SECRET, AUTH_SECRET, NEXTAUTH_SECRET, CSRF_SECRET, or SETTINGS_MASTER_KEY must be configured.");
  }

  const secret = raw.length >= 32 ? raw : createHash("sha256").update(raw).digest("hex");
  return new TextEncoder().encode(secret);
}

function sessionTtlHours() {
  const value = Number(process.env.SESSION_TTL_HOURS ?? 12);
  return Number.isFinite(value) && value > 0 ? value : 12;
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function signSessionToken(payload: SessionTokenPayload) {
  const ttlHours = sessionTtlHours();

  return new SignJWT({ role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.userId)
    .setJti(payload.sessionId)
    .setIssuedAt()
    .setExpirationTime(`${ttlHours}h`)
    .sign(jwtSecret());
}

export async function verifySessionToken(token: string): Promise<SessionTokenPayload> {
  const { payload } = await jwtVerify(token, jwtSecret());

  if (!payload.sub || !payload.jti || (payload.role !== "USER" && payload.role !== "ADMIN")) {
    throw new Error("Invalid session token.");
  }

  return {
    userId: payload.sub,
    sessionId: payload.jti,
    role: payload.role
  };
}

export async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function createSession(user: { id: string; role: Role }, options?: { ip?: string; userAgent?: string }) {
  const expiresAt = new Date(Date.now() + sessionTtlHours() * 60 * 60 * 1000);
  // Pre-generate a MongoDB-compatible ObjectId (12 random bytes → 24-char hex).
  // Signing the JWT before the DB write lets us set the real tokenHash in one
  // create call, eliminating the follow-up session.update that triggers P2031
  // on standalone (non-replica-set) MongoDB.
  const sessionId = randomBytes(12).toString("hex");
  const token = await signSessionToken({ sessionId, userId: user.id, role: user.role });
  const tokenHash = await sha256(token);

  const session = await prisma.session.create({
    data: {
      id: sessionId,
      userId: user.id,
      tokenHash,
      ip: options?.ip,
      userAgent: options?.userAgent,
      expiresAt
    }
  });

  return { token, expiresAt, sessionId: session.id };
}

export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;
  if (!token) {
    return null;
  }

  try {
    const payload = await verifySessionToken(token);
    const tokenHash = await sha256(token);
    // Note: we intentionally omit `revokedAt: null` from the WHERE clause
    // because Prisma's MongoDB connector treats `{ field: null }` filters
    // as not matching documents where the field is *missing* (vs. set to
    // null). Sessions are created without explicitly setting `revokedAt`,
    // so we filter it post-fetch instead.
    const session = await prisma.session.findFirst({
      where: {
        id: payload.sessionId,
        tokenHash,
        expiresAt: { gt: new Date() }
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            status: true,
            preferredLocale: true,
            themePreference: true
          }
        }
      }
    });

    if (!session || session.revokedAt || session.user.status === "SUSPENDED") {
      return null;
    }

    return session.user;
  } catch {
    return null;
  }
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Response("Unauthorized", { status: 401 });
  }

  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    throw new Response("Forbidden", { status: 403 });
  }

  return user;
}

export async function revokeCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;
  if (!token) {
    return;
  }

  const payload = await verifySessionToken(token).catch(() => null);
  if (payload) {
    await prisma.session.updateMany({
      where: { id: payload.sessionId },
      data: { revokedAt: new Date() }
    });
  }
}

export async function requestIpAndAgent() {
  const headerStore = await headers();

  return {
    ip: headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ?? headerStore.get("x-real-ip") ?? undefined,
    userAgent: headerStore.get("user-agent") ?? undefined
  };
}
