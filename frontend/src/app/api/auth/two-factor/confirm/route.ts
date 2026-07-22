import { NextRequest } from "next/server";
import speakeasy from "speakeasy";
import { z } from "zod";
import { handleApi, ok } from "@/lib/api";
import { auditLog } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendTransactionalEmail } from "@/lib/transactional-email";

const schema = z.object({ token: z.string().min(6) });

export async function POST(request: NextRequest) {
  return handleApi(async () => {
    const user = await requireUser();
    const input = schema.parse(await request.json());
    const record = await prisma.user.findUnique({ where: { id: user.id } });
    if (!record?.twoFactorSecret) {
      throw new Response("Two-factor setup has not been started.", { status: 400 });
    }

    const valid = speakeasy.totp.verify({
      secret: record.twoFactorSecret,
      encoding: "base32",
      token: input.token,
      window: 1
    });
    if (!valid) {
      throw new Response("Invalid two-factor token.", { status: 400 });
    }

    await prisma.user.update({ where: { id: user.id }, data: { twoFactorEnabled: true } });
    await auditLog({ actorId: user.id, action: "TWO_FACTOR_ENABLED", entity: "User", entityId: user.id });
    await sendTransactionalEmail({
      event: "TWO_FACTOR_ENABLED", to: user.email, idempotencyKey: `two-factor-enabled:${user.id}`,
      relatedUserId: user.id, relatedEntityType: "User", relatedEntityId: user.id,
      data: { customerName: `${user.firstName} ${user.lastName}`, timestamp: new Date(), nextStep: "Use your authenticator code for future sign-ins. Contact support immediately if you did not make this change." }
    });

    return ok({ success: true });
  });
}
