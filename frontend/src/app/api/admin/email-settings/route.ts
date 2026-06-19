import { NextRequest } from "next/server";
import { z } from "zod";
import { handleApi, ok } from "@/lib/api";
import { auditLog } from "@/lib/audit";
import { requireAdmin, requestIpAndAgent } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { encryptSecret } from "@/lib/email";

const schema = z.object({
  gmailAddress: z.string().email().optional().nullable(),
  appPassword: z.string().min(8).optional().nullable(),
  smtpHost: z.string().min(3),
  smtpPort: z.coerce.number().int().positive(),
  smtpSecure: z.boolean(),
  senderName: z.string().min(2)
});

export async function GET() {
  return handleApi(async () => {
    await requireAdmin();
    const settings = await prisma.emailSetting.findUnique({ where: { id: 1 } });
    return ok({
      settings: settings
        ? { ...settings, appPasswordEncrypted: settings.appPasswordEncrypted ? "configured" : null }
        : null
    });
  });
}

export async function PUT(request: NextRequest) {
  return handleApi(async () => {
    const admin = await requireAdmin();
    const input = schema.parse(await request.json());
    const { ip, userAgent } = await requestIpAndAgent();
    const data = {
      gmailAddress: input.gmailAddress,
      // Strip spaces — Gmail App Passwords must be entered without spaces
      appPasswordEncrypted: input.appPassword ? encryptSecret(input.appPassword.replace(/\s/g, "")) : undefined,
      smtpHost: input.smtpHost,
      smtpPort: input.smtpPort,
      smtpSecure: input.smtpSecure,
      senderName: input.senderName
    };
    const existing = await prisma.emailSetting.findUnique({ where: { id: 1 } });
    const settings = existing
      ? await prisma.emailSetting.update({ where: { id: 1 }, data })
      : await prisma.emailSetting.create({ data: { id: 1, ...data } });
    await auditLog({
      actorId: admin.id,
      action: "ADMIN_UPDATED_EMAIL_SETTINGS",
      entity: "EmailSetting",
      entityId: "1",
      metadata: { gmailAddress: input.gmailAddress, smtpHost: input.smtpHost, smtpPort: input.smtpPort },
      ip,
      userAgent
    });

    return ok({ settings: { ...settings, appPasswordEncrypted: settings.appPasswordEncrypted ? "configured" : null } });
  });
}
