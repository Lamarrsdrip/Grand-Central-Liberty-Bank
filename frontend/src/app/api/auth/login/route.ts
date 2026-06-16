import { NextRequest } from "next/server";
import speakeasy from "speakeasy";
import { handleApi, ok } from "@/lib/api";
import { auditLog } from "@/lib/audit";
import { createSession, requestIpAndAgent, sessionCookieName, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assertRateLimit } from "@/lib/security";
import { loginSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  return handleApi(async () => {
    assertRateLimit(request, "login", 10);
    const input = loginSchema.parse(await request.json());
    const { ip, userAgent } = await requestIpAndAgent();
    const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
    const passwordValid = user ? await verifyPassword(input.password, user.passwordHash) : false;

    await prisma.loginHistory.create({
      data: {
        userId: user?.id,
        email: input.email.toLowerCase(),
        ip,
        userAgent,
        success: Boolean(user && passwordValid)
      }
    });

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
    await auditLog({ actorId: user.id, action: "USER_LOGIN", entity: "Session", entityId: session.sessionId, ip, userAgent });

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
