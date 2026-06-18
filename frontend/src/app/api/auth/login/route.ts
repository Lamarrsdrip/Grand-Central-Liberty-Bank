import { NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import speakeasy from "speakeasy";
import { handleApi, ok } from "@/lib/api";
import { auditLog } from "@/lib/audit";
import { createSession, requestIpAndAgent, sessionCookieName, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assertRateLimit } from "@/lib/security";
import { loginSchema } from "@/lib/validators";

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
    assertRateLimit(request, "login", 10);
    const input = loginSchema.parse(await request.json());
    const { ip, userAgent } = await requestIpAndAgent();
    const lookupEmail = input.email.toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: lookupEmail } });

    // Temporary debug — BUILD:2026-06-18T-login-debug
    console.error("[login:debug] BUILD=2026-06-18T-login-debug email=%s found=%s role=%s status=%s hashPrefix=%s",
      lookupEmail,
      user ? "yes" : "no",
      user?.role ?? "n/a",
      user?.status ?? "n/a",
      user?.passwordHash ? user.passwordHash.slice(0, 7) : "MISSING"
    );

    const passwordValid = user ? await verifyPassword(input.password, user.passwordHash) : false;

    console.error("[login:debug] passwordValid=%s", passwordValid);

    void recordLoginAttempt({
        userId: user?.id,
        email: lookupEmail,
        ip,
        userAgent,
        success: Boolean(user && passwordValid)
      }).catch((error) => console.error("[auth] login history failed:", error));

    if (!user || !passwordValid || user.status === "SUSPENDED") {
      throw new Response("Invalid credentials.", { status: 401 });
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
    return response;
  });
}
