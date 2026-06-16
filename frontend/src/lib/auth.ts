import { cookies, headers } from "next/headers";
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
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters.");
  }

  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function signSessionToken(payload: SessionTokenPayload) {
  const ttlHours = Number(process.env.SESSION_TTL_HOURS ?? 12);

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
  const expiresAt = new Date(Date.now() + Number(process.env.SESSION_TTL_HOURS ?? 12) * 60 * 60 * 1000);
  const session = await prisma.session.create({
    data: {
      userId: user.id,
      tokenHash: crypto.randomUUID(),
      ip: options?.ip,
      userAgent: options?.userAgent,
      expiresAt
    }
  });
  const token = await signSessionToken({
    sessionId: session.id,
    userId: user.id,
    role: user.role
  });

  await prisma.session.update({
    where: { id: session.id },
    data: { tokenHash: await sha256(token) }
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
    const session = await prisma.session.findFirst({
      where: {
        id: payload.sessionId,
        tokenHash,
        revokedAt: null,
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

    if (!session || session.user.status === "SUSPENDED") {
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
