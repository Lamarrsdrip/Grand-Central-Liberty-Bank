import { NextRequest } from "next/server";
import { z } from "zod";
import { handleApi, ok } from "@/lib/api";
import { sha256 } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendTransactionalEmail } from "@/lib/transactional-email";
import { absoluteUrl } from "@/lib/utils";
import { assertRateLimit } from "@/lib/security";

const schema = z.object({ email: z.string().email() });

export async function POST(request: NextRequest) {
  return handleApi(async () => {
    assertRateLimit(request, "forgot-password", 5);
    const { email } = schema.parse(await request.json());
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (user) {
      const rawToken = crypto.randomUUID();
      const reset = await prisma.passwordResetToken.create({
        data: {
          email: user.email,
          tokenHash: await sha256(rawToken),
          expiresAt: new Date(Date.now() + 1000 * 60 * 30)
        }
      });
      await sendTransactionalEmail({
        event: "PASSWORD_RESET_REQUESTED",
        to: user.email,
        idempotencyKey: `password-reset-requested:${reset.id}`,
        relatedUserId: user.id,
        relatedEntityType: "PasswordResetToken",
        relatedEntityId: reset.id,
        data: {
          customerName: `${user.firstName} ${user.lastName}`,
          actionUrl: absoluteUrl(`/reset-password?token=${rawToken}`),
          nextStep: "Use the secure link within 30 minutes. If you did not request this, no action is required."
        }
      });
    }

    return ok({ message: "If that account exists, a password reset email has been sent." });
  });
}
