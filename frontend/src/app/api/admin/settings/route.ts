import { NextRequest } from "next/server";
import { z } from "zod";
import { handleApi, ok } from "@/lib/api";
import { auditLog } from "@/lib/audit";
import { requireAdmin, requestIpAndAgent } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SUPPORTED_LOCALES } from "@/lib/locales";

const localeEnum = z.enum(SUPPORTED_LOCALES as unknown as [string, ...string[]]);

const schema = z.object({
  bankName: z.string().min(2),
  bankAddress: z.string().min(5),
  supportEmail: z.string().email(),
  supportPhone: z.string().min(5),
  websiteUrl: z.string().url(),
  defaultLocale: localeEnum,
  supportedLocales: z.array(localeEnum).min(1),
  terms: z.string().min(20),
  privacyPolicy: z.string().min(20)
});

export async function GET() {
  return handleApi(async () => {
    await requireAdmin();
    const settings = await prisma.bankSetting.findUnique({ where: { id: 1 } });
    return ok({ settings });
  });
}

export async function PUT(request: NextRequest) {
  return handleApi(async () => {
    const admin = await requireAdmin();
    const input = schema.parse(await request.json());
    const { ip, userAgent } = await requestIpAndAgent();
    const settings = await prisma.bankSetting.upsert({
      where: { id: 1 },
      update: input,
      create: { id: 1, ...input }
    });
    await auditLog({
      actorId: admin.id,
      action: "ADMIN_UPDATED_BANK_SETTINGS",
      entity: "BankSetting",
      entityId: "1",
      metadata: { bankName: input.bankName, defaultLocale: input.defaultLocale },
      ip,
      userAgent
    });

    return ok({ settings });
  });
}
