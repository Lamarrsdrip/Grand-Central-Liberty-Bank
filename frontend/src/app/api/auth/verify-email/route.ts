import { NextRequest } from "next/server";
import { z } from "zod";
import { handleApi, ok } from "@/lib/api";
import { auditLog } from "@/lib/audit";
import { sha256 } from "@/lib/auth";
import { prisma } from "@/lib/db";

const schema = z.object({ token: z.string().min(10) });

export async function POST(request: NextRequest) {
  return handleApi(async () => {
    const { token } = schema.parse(await request.json());
    const verification = await prisma.emailVerificationToken.findFirst({
      where: { tokenHash: await sha256(token), usedAt: null, expiresAt: { gt: new Date() } }
    });
    if (!verification) {
      throw new Response("Verification link is invalid or expired.", { status: 400 });
    }

    await prisma.user.update({
      where: { id: verification.userId },
      data: { emailVerifiedAt: new Date() }
    });
    await prisma.emailVerificationToken.update({ where: { id: verification.id }, data: { usedAt: new Date() } });
    await auditLog({ actorId: verification.userId, action: "EMAIL_VERIFIED", entity: "User", entityId: verification.userId });

    return ok({ success: true });
  });
}
