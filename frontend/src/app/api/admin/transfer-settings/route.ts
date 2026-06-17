import { NextRequest } from "next/server";
import { z } from "zod";
import { handleApi, ok } from "@/lib/api";
import { auditLog } from "@/lib/audit";
import { requireAdmin, requestIpAndAgent } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { defaultTransferSettings } from "@/lib/domain";

const schema = z.object({
  successMessage: z.string().min(4),
  reviewMessage: z.string().min(10),
  failedMessage: z.string().min(10),
  blockedMessage: z.string().min(10),
  reasonText: z.string().min(10),
  buttonText: z.string().min(2),
  supportInstructions: z.string().min(10),
  referencePrefix: z.string().min(2).max(12)
});

export async function GET() {
  return handleApi(async () => {
    await requireAdmin();
    const settings = await prisma.transferSetting.findUnique({ where: { id: 1 } });
    return ok({ settings: settings ?? defaultTransferSettings });
  });
}

export async function PUT(request: NextRequest) {
  return handleApi(async () => {
    const admin = await requireAdmin();
    const input = schema.parse(await request.json());
    const { ip, userAgent } = await requestIpAndAgent();
    const existing = await prisma.transferSetting.findUnique({ where: { id: 1 } });
    const settings = existing
      ? await prisma.transferSetting.update({ where: { id: 1 }, data: input })
      : await prisma.transferSetting.create({ data: { id: 1, ...input } });
    await auditLog({
      actorId: admin.id,
      action: "ADMIN_UPDATED_TRANSFER_SETTINGS",
      entity: "TransferSetting",
      entityId: "1",
      metadata: input,
      ip,
      userAgent
    });

    return ok({ settings });
  });
}
