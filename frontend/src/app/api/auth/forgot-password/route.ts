import { NextRequest } from "next/server";
import { z } from "zod";
import { handleApi, ok } from "@/lib/api";
import { sha256 } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
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
      await prisma.passwordResetToken.create({
        data: {
          email: user.email,
          tokenHash: await sha256(rawToken),
          expiresAt: new Date(Date.now() + 1000 * 60 * 30)
        }
      });
      await sendEmail({
        to: user.email,
        subject: "Reset your Grand Central Liberty Bank password",
        html: `<p>Use the secure link below to reset your password.</p><p><a href="${absoluteUrl(`/reset-password?token=${rawToken}`)}">Reset password</a></p>`
      });
    }

    return ok({ message: "If that account exists, a password reset email has been sent." });
  });
}
