import { NextRequest } from "next/server";
import { z } from "zod";
import { handleApi, ok } from "@/lib/api";
import { auditLog, notifyUser } from "@/lib/audit";
import { hashPassword, sha256 } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assertRateLimit } from "@/lib/security";

const schema = z.object({ token: z.string().min(10), password: z.string().min(12) });

export async function POST(request: NextRequest) {
  return handleApi(async () => {
    assertRateLimit(request, "reset-password", 10);
    const input = schema.parse(await request.json());
    const tokenHash = await sha256(input.token);
    const reset = await prisma.passwordResetToken.findFirst({
      where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } }
    });
    if (!reset) {
      throw new Response("Password reset link is invalid or expired.", { status: 400 });
    }

    const user = await prisma.user.update({
      where: { email: reset.email },
      data: { passwordHash: await hashPassword(input.password) }
    });
    await prisma.passwordResetToken.update({ where: { id: reset.id }, data: { usedAt: new Date() } });
    await notifyUser(user.id, {
      type: "PASSWORD_CHANGED",
      title: "Password changed",
      body: "Your password was changed successfully."
    });
    await auditLog({ actorId: user.id, action: "PASSWORD_RESET", entity: "User", entityId: user.id });

    return ok({ success: true });
  });
}
